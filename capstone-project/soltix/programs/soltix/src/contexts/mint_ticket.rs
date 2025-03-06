use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, MintTo, Token, TokenAccount},
};

use crate::{
    errors::ErrorCode,
    state::{Event, Whitelist},
};

#[derive(Accounts)]
#[instruction(tier_index: u8)]
pub struct MintTicket<'info> {
    // Event accounts
    #[account(mut)]
    pub event: Account<'info, Event>,
    #[account(
        seeds = [b"whitelist", event.key().as_ref()],
        bump = event.whitelist_bump
    )]
    pub whitelist: Account<'info, Whitelist>,

    // Buyer accounts
    #[account(mut)]
    pub buyer: Signer<'info>,

    // Mint accounts - initialize if it's the first mint for this tier
    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,
        mint::authority = organizer,
        seeds = [b"ticket_mint", event.key().as_ref(), &[tier_index]],
        bump,
    )]
    pub ticket_mint: Account<'info, Mint>,

    // Initialize the associated token account if it doesn't exist
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = ticket_mint,
        associated_token::authority = buyer
    )]
    pub buyer_ata: Account<'info, TokenAccount>,

    // Metadata account
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    // Organizer account
    #[account(mut)]
    pub organizer: SystemAccount<'info>,

    // Program accounts
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Validated in CPI
    pub token_metadata_program: UncheckedAccount<'info>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> MintTicket<'info> {
    pub fn mint_ticket(&mut self, tier_index: u8) -> Result<()> {
        // Verify tier_index is valid
        if tier_index as usize >= self.event.tiers.len() {
            return Err(ErrorCode::InvalidTier.into());
        }

        // Try to get whitelist discount, default to 0 if not whitelisted
        let discount = match self.get_whitelist_discount(tier_index) {
            Ok(discount) => discount,
            Err(_) => 0, // Not whitelisted, no discount
        };

        // Calculate price and validate tier
        let tier_price = self.event.tiers[tier_index as usize].price;
        let ticket_price = tier_price
            .checked_sub(discount)
            .ok_or(error!(ErrorCode::ArithmeticOverflow))?;

        // Check if max supply is reached
        let tier = &self.event.tiers[tier_index as usize];
        if tier.max_supply > 0 && tier.minted >= tier.max_supply {
            return Err(ErrorCode::SoldOut.into());
        }

        // Process payment
        self.transfer_payment(ticket_price)?;

        // Mint the NFT token
        self.mint_nft_token()?;

        // Update count
        let current_minted = self.event.tiers[tier_index as usize].minted;
        self.event.tiers[tier_index as usize].minted = current_minted
            .checked_add(1)
            .ok_or(error!(ErrorCode::ArithmeticOverflow))?;

        msg!("Successfully minted ticket for tier {}", tier_index);
        Ok(())
    }

    fn get_whitelist_discount(&self, tier_index: u8) -> Result<u64> {
        let buyer_key = self.buyer.key();
        let entry = self
            .whitelist
            .fans
            .iter()
            .find(|entry| entry.wallet == buyer_key && entry.tier_index == tier_index);

        match entry {
            Some(entry) => Ok(entry.discount),
            None => Err(ErrorCode::NotWhitelisted.into()),
        }
    }

    fn transfer_payment(&self, amount: u64) -> Result<()> {
        let from = self.buyer.key();
        let to = self.organizer.key();

        let ix = anchor_lang::solana_program::system_instruction::transfer(&from, &to, amount);

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                self.buyer.to_account_info(),
                self.organizer.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(|_| error!(ErrorCode::InsufficientFunds))?;

        msg!("Payment of {} lamports transferred to organizer", amount);
        Ok(())
    }

    fn mint_nft_token(&self) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: self.ticket_mint.to_account_info(),
            to: self.buyer_ata.to_account_info(),
            authority: self.organizer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);

        anchor_spl::token::mint_to(cpi_ctx, 1)?;
        msg!("Minted NFT token to buyer");

        Ok(())
    }
}
