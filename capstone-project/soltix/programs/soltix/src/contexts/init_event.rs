use anchor_lang::prelude::*;
use crate::state::{Event, Whitelist};

#[derive(Accounts)]
#[instruction(event_id: String, tiers: Vec<TicketTier>)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        init,
        payer = organizer,
        space = 8 + 32 + 64 + (4 + 64 * 5) + 1,
        seeds = [b"event", event_id.as_bytes()],
        bump,
    )]
    pub event: Account<'info, Event>,
    #[account(
        init,
        payer = organizer,
        space = 8 + 4 + 64 + 64,
        seeds = [b"whitelist", event.key().as_ref()],
        bump,
    )]
    pub whitelist: Account<'info, Whitelist>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateEvent<'info> {
    pub fn create_event(
        &mut self,
        event_id: String,
        ticket_price: u64,
    ) -> Result<()> {
        let event = &mut self.event;
        event.tiers = tiers;
        event.organizer = *self.organizer.key;
        event.event_id = event_id;
        event.ticket_price = ticket_price;
        event.whitelist_bump = self.bumps.get("whitelist").unwrap();

        let whitelist = &mut self.whitelist;
        whitelist.event_id = event_id;

        Ok(())
        
    }
}