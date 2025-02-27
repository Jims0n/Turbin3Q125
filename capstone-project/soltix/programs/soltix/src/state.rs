use anchor_lang::prelude::*;

#[account]
pub struct Event {
    pub organizer: Pubkey,
    pub event_id: String,
    pub tiers: Vec<TicketTier>, // List of available ticket types
    pub whitelist_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TicketTier {
    pub name: String,        // "VIP", "Regular", etc.
    pub price: u64,         // Price in lamports
    pub perks: String,      // Comma-separated perks
    pub max_supply: u32,    // 0 for unlimited
    pub minted: u32,        // Track number minted
}

#[account]
pub struct Ticket {
    pub event_id: String,
    pub owner: Pubkey,
    pub tier_index: u8,     // Index in event.tiers array
    pub mint: Pubkey,
}

#[account]
pub struct Whitelist {
    pub fans: Vec<WhitelistEntry>,
    pub event_id: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WhitelistEntry {
    pub wallet: Pubkey,
    pub tier_index: u8,     // Which tier this applies to
    pub discount: u64,     // Optional discount amount
}