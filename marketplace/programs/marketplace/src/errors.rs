use anchor_lang::prelude::*;

#[error_code]
pub enum MarketplaceError {
    #[msg("The given name is too long")]
    NameTooLong,
    #[msg("Custom error message")]
    CustomError,
    #[msg("Invalid name")]
    InvalidName,
    #[msg("Invalid Collection")]
    InvalidCollection,
    #[msg("Collection not set")]
    CollectionNotSet,
}

