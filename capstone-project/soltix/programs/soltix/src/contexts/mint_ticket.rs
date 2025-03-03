use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, MintTo, Token, TokenAccount},
};

use crate::{
    errors::ErrorCode,
    state::{Event, TicketTier, Whitelist},
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
    #[account(
        mut,
        associated_token::mint = ticket_mint,
        associated_token::authority = buyer
    )]
    pub buyer_ata: Account<'info, TokenAccount>,

    // Mint accounts
    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,
        mint::authority = event.organizer,
        seeds = [b"ticket_mint", event.key().as_ref(), &[tier_index]],
        bump,
    )]
    pub ticket_mint: Account<'info, Mint>,

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
        // Get whitelist discount first
        let discount = self.get_whitelist_discount(tier_index)?;

        // Calculate price and validate tier
        let tier_price = self.event.tiers[tier_index as usize].price;
        let ticket_price = tier_price
            .checked_sub(discount)
            .ok_or(ProgramError::from(ProgramError::ArithmeticOverflow))?;

        // Check if first mint for this tier
        let is_first_mint = self.event.tiers[tier_index as usize].minted == 0;

        // Process payment
        self.transfer_payment(ticket_price)?;

        // Initialize mint if first ticket
        if is_first_mint {
            self.initialize_mint()?;
        }

        // Mint the NFT
        self.mint_nft_token()?;

        // Create metadata if first ticket
        if is_first_mint {
            let tier = &self.event.tiers[tier_index as usize];
            self.create_nft_metadata(tier)?;
        }

        // Update count
        let current_minted = self.event.tiers[tier_index as usize].minted;
        self.event.tiers[tier_index as usize].minted = current_minted
            .checked_add(1)
            .ok_or(ProgramError::from(ProgramError::ArithmeticOverflow))?;

        Ok(())
    }

    fn get_whitelist_discount(&self, tier_index: u8) -> Result<u64> {
        let buyer_key = self.buyer.key();
        self.whitelist
            .fans
            .iter()
            .find(|entry| entry.wallet == buyer_key && entry.tier_index == tier_index)
            .map(|entry| entry.discount)
            .ok_or(error!(ErrorCode::NotWhitelisted))
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

        Ok(())
    }

    fn initialize_mint(&self) -> Result<()> {
        anchor_spl::token::initialize_mint(
            CpiContext::new(
                self.token_program.to_account_info(),
                anchor_spl::token::InitializeMint {
                    mint: self.ticket_mint.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
            ),
            0,
            &self.event.organizer,
            Some(&self.event.organizer),
        )?;
        Ok(())
    }

    fn mint_nft_token(&self) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: self.ticket_mint.to_account_info(),
            to: self.buyer_ata.to_account_info(),
            authority: self.event.to_account_info(),
        };

        let seeds = &[
            b"event",
            self.event.event_id.as_bytes(),
            &[self.event.whitelist_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        anchor_spl::token::mint_to(cpi_ctx, 1)?;

        Ok(())
    }

    fn create_nft_metadata(&self, _tier: &TicketTier) -> Result<()> {
        // TODO: Implement metadata creation when mpl-token-metadata is properly set up
        Ok(())
    }
}
