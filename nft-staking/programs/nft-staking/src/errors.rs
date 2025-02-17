use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Freeze period not passed")]
    FreezePeriodNotPassed,
    #[msg("maximum stake reached")]
    MaxStake,
}