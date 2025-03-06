pub mod contexts;
pub mod errors;
pub mod state;

pub use contexts::*;
pub use state::*;

use anchor_lang::prelude::*;

declare_id!("AY7npdHaC7Sx4tfbKhbw4NHsLasz8Qm4E8h9H4GvVYy6");

#[program]
pub mod soltix {

    use super::*;

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: String,
        tiers: Vec<TicketTier>,
    ) -> Result<()> {
        ctx.accounts.create_event(event_id, tiers, &ctx.bumps)
    }

    pub fn add_to_whitelist(
        ctx: Context<AddToWhitelist>,
        fan_wallet: Pubkey,
        tier_index: u8,
        discount: u64,
    ) -> Result<()> {
        ctx.accounts
            .add_to_whitelist(fan_wallet, tier_index, discount)?;
        Ok(())
    }

    pub fn mint_ticket(ctx: Context<MintTicket>, tier_index: u8) -> Result<()> {
        ctx.accounts.mint_ticket(tier_index)?;
        Ok(())
    }
}
