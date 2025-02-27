use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        create_initialize_mint_account, mint_to, CreateInitializeMintAccount, Mint, MintTo, Token,
        TokenAccount,
    },
};
use mpl_token_metadata::{
    instruction::create_metadata_accounts_v3,
    state::{Collection, Creator, DataV2},
};

use crate::state::Event;

#[derive(Accounts)]
#[instruction(tier_index: u8)]
pub struct MintTicket<'info> {
    // Event accounts
    #[account(mut)]
    pub event: Account<'info, Event>,

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
        let event = &mut self.event;
        let tier = &event.tiers[tier_index as usize];

        // Validate payment
        let ticket_price = tier
            .price
            .checked_sub(get_whitelist_discount(&self.buyer.key(), tier_index, event))
            .ok_or(ErrorCode::InsufficientFunds)?;

        transfer_payment(
            ticket_price,
            &self.buyer,
            &self.organizer,
            &self.system_program,
        )?;

        // Initialize mint if first ticket of tier
        if tier.minted == 0 {
            initialize_mint_account(&ctx)?;
        }

        // Mint ticket to buyer
        mint_nft_token(
            &self.ticket_mint,
            &self.buyer_ata,
            &self.event.organizer,
            &self.token_program,
        )?;

        // Create metadata account if first ticket of event
        if tier.minted == 0 {
            create_nft_metadata(
                &self.ticket_mint,
                &self.metadata_account,
                &self.event.organizer,
                &self.token_metadata_program,
                tier,
            )?;
        }

        // Update ticket count
        tier.minted += 1;
        event.total_tickets += 1;

        Ok(())
    }

    fn get_whitelist_discount(fan_wallet: &Pubkey, tier_index: u8, event: &Event) -> Result<u64> {
        let whitelist = Whitelist::get(&event.key());
        let entry = whitelist
            .fans
            .iter()
            .find(|entry| entry.wallet == *fan_wallet && entry.tier_index == tier_index)
            .ok_or(ErrorCode::NotWhitelisted)?;

        Ok(entry.discount)
    }

    fn transfer_payment(
        amount: u64,
        buyer: &Signer<'info>,
        organizer: &SystemAccount<'info>,
        system_program: &Program<'info, System>,
    ) -> Result<()> {
        let cpi_accounts = Transfer {
            from: buyer.to_account_info(),
            to: organizer.to_account_info(),
            authority: buyer.to_account_info(),
        };

        let cpi_program = system_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        system_program.transfer(cpi_ctx, amount)?;

        Ok(())
    }

    fn initialize_mint_account(ctx: &Context<MintTicket>) -> Result<()> {
        let cpi_accounts = CreateInitializeMintAccount {
            mint: ctx.accounts.ticket_mint.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
            mint_authority: ctx.accounts.event.organizer.to_account_info(),
            payer: ctx.accounts.buyer.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        create_initialize_mint_account(cpi_ctx, 0)?;

        Ok(())
    }

    fn mint_nft_token(
        ticket_mint: &AccountInfo<'info>,
        buyer_ata: &AccountInfo<'info>,
        organizer: &SystemAccount<'info>,
        token_program: &Program<'info, Token>,
    ) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ticket_mint.to_account_info(),
            to: buyer_ata.to_account_info(),
            authority: organizer.to_account_info(),
        };

        let seeds = &[
            b"ticket_mint",
            ticket_mint.key.as_ref(),
            organizer.key.as_ref(),
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_program = token_program.clone();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        mint_to(cpi_ctx, 1)?;

        Ok(())
    }

    fn create_nft_metadata(
        ticket_mint: &AccountInfo<'info>,
        metadata_account: &AccountInfo<'info>,
        organizer: &SystemAccount<'info>,
        token_metadata_program: &UncheckedAccount<'info>,
        tier: &TicketTier,
    ) -> Result<()> {
        let cpi_accounts = create_metadata_accounts_v3::CreateMetadataAccountsV3 {
            data: metadata_account.to_account_info(),
            mint: ticket_mint.to_account_info(),
            mint_authority: organizer.to_account_info(),
            payer: organizer.to_account_info(),
            system_program: token_metadata_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };

        let cpi_program = token_metadata_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        create_metadata_accounts_v3(
            cpi_ctx,
            DataV2 {
                name: format!("{} Ticket", tier.name),
                symbol: format!("{}T", tier.name),
                uri: format!("{}ticket", tier.name),
                creators: vec![Creator {
                    address: organizer.key(),
                    share: 100,
                }],
                royalty: None,
                files: vec![],
                animation_url: None,
                properties: None,
                collection: Collection {
                    name: "Ticket Collection".to_string(),
                    family: "Ticket".to_string(),
                    prefix: "T".to_string(),
                },
            },
        )?;

        Ok(())
    }
}
