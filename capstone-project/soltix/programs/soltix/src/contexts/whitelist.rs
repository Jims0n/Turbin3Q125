use crate::{
    errors::ErrorCode,
    state::{Event, Whitelist, WhitelistEntry},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(fan_wallet: Pubkey, tier_index: u8, discount: u64)]
pub struct AddToWhitelist<'info> {
    // Organizer
    #[account(mut)]
    pub organizer: Signer<'info>,

    // Event account
    #[account(
        mut,
        has_one = organizer @ ErrorCode::Unauthorized,
        seeds = [b"event", event.event_id.as_bytes()],
        bump,
    )]
    pub event: Account<'info, Event>,

    // Whitelist PDA
    #[account(
        init_if_needed,
        payer = organizer,
        space = 8 + 4 + (32 + 1 + 8) * 100, // Space for 100 entries
        seeds = [b"whitelist", event.key().as_ref()],
        bump,
    )]
    pub whitelist: Account<'info, Whitelist>,

    // System program
    pub system_program: Program<'info, System>,
}

impl<'info> AddToWhitelist<'info> {
    pub fn add_to_whitelist(
        &mut self,
        fan_wallet: Pubkey,
        tier_index: u8,
        discount: u64,
    ) -> Result<()> {
        //Check for duplicate entries
        require!(
            !self
                .whitelist
                .fans
                .iter()
                .any(|entry| entry.wallet == fan_wallet),
            ErrorCode::DuplicateWhitelistEntry
        );

        let whitelist = &mut self.whitelist;
        let entry = WhitelistEntry {
            wallet: fan_wallet,
            tier_index,
            discount,
        };
        whitelist.fans.push(entry);
        Ok(())
    }
}
