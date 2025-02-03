use anchor_lang::prelude::*;

pub struct Marketplace {
    pub admin: Pubkey,
    pub fee: u16,
    pub bump: u8,
    pub treasury_bump: u8,
    pub rewards_bump: u8,
    pub name: String,
}

impl Space for Marketplace {
    const INIT_SPACE: usize = 8 + 32 + 2 + 1 + 1 + 4 + 32;
}

#[account]
pub struct Listing {
    pub maker: Pubkey,
    pub mint: Pubkey,
    pub price: u64,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Space for Listing {
    const INIT_SPACE: usize = 8 + 32 + 32 + 8 + 1 + 1;
}