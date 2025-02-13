use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use crate::instructions::*;

declare_id!("A2rhTqfm2uHyChiDurS66FUV42fURpkWHeGus7qRQDLq");

#[program]
pub mod escrow {
    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64, receive_amount: u64, deposit_amount: u64,) -> Result<()> {
       ctx.accounts.make(seed, receive_amount, ctx.bumps)?;
       ctx.accounts.deposit(deposit_amount)?;
        Ok(())
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.transfer_to_maker()?;
        ctx.accounts.transfer_to_taker()?;
        ctx.accounts.close_vault()?;
        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund()?;
        ctx.accounts.close()?;
        Ok(())
    }
}

