use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // General errors (6000-6009)
    #[msg("Unauthorized organizer action")]
    Unauthorized = 6000,
    #[msg("Invalid event configuration")]
    InvalidEventConfig,
    #[msg("Invalid ticket tier index")]
    InvalidTier,

    // Payment errors (6010-6019)
    #[msg("Incorrect payment amount")]
    IncorrectPayment,
    #[msg("Invalid discount amount")]
    InvalidDiscount,
    #[msg("Insufficient funds for transaction")]
    InsufficientFunds,

    // Ticket minting errors (6020-6029)
    #[msg("This ticket tier is sold out")]
    SoldOut,
    #[msg("Ticket minting limit exceeded")]
    MintLimitExceeded,
    #[msg("Ticket transfer not allowed")]
    TransferDisabled,

    // Whitelist errors (6030-6039)
    #[msg("User not whitelisted for this tier")]
    NotWhitelisted,
    #[msg("Whitelist entry already exists")]
    DuplicateWhitelistEntry,
    #[msg("Whitelist capacity exceeded")]
    WhitelistFull,

    // NFT metadata errors (6040-6049)
    #[msg("Failed to create NFT metadata")]
    MetadataCreationFailed,
    #[msg("Invalid metadata URI")]
    InvalidMetadataUri,
    #[msg("Royalty percentage out of bounds")]
    InvalidRoyalties,

    // Program safety errors (6050-6059)
    #[msg("Invalid account owner")]
    InvalidOwner,
    #[msg("Invalid PDA derivation")]
    InvalidPda,
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
}