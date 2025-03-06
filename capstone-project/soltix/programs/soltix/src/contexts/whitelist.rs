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

    // Whitelist PDA - already initialized in CreateEvent
    #[account(
        mut,
        seeds = [b"whitelist", event.key().as_ref()],
        bump = event.whitelist_bump,
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
        // Check for duplicate entries
        let duplicate = self
            .whitelist
            .fans
            .iter()
            .any(|entry| entry.wallet == fan_wallet && entry.tier_index == tier_index);

        if duplicate {
            return Err(ErrorCode::DuplicateWhitelistEntry.into());
        }

        // Verify tier_index is valid
        if tier_index as usize >= self.event.tiers.len() {
            return Err(ErrorCode::InvalidTier.into());
        }

        // Add the entry to the whitelist
        let whitelist = &mut self.whitelist;
        let entry = WhitelistEntry {
            wallet: fan_wallet,
            tier_index,
            discount,
        };
        whitelist.fans.push(entry);

        msg!(
            "Added wallet {} to whitelist for tier {} with discount {}",
            fan_wallet.to_string(),
            tier_index,
            discount
        );

        Ok(())
    }
}
