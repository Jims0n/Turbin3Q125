# Soltix - Solana Ticket Marketplace

Soltix is a decentralized ticket marketplace built on the Solana blockchain. It allows event organizers to create events, define ticket tiers, manage whitelists, and enables users to purchase tickets as NFTs.

## Features

- Create events with multiple ticket tiers
- Whitelist functionality for early access and discounts
- Mint tickets as NFTs
- Secure and transparent ticket sales

## Project Structure

- `programs/soltix/src/`: Rust program code
  - `lib.rs`: Main program entry points
  - `state.rs`: Data structures
  - `contexts/`: Instruction contexts
  - `errors.rs`: Custom error definitions
- `tests/`: TypeScript tests
- `scripts/`: Helper scripts for testing and deployment

## Deployed Program

The program is deployed on Solana devnet with the Program ID:

```
FNfJk8nYykTmKMAfyr2zjSqtrfWNR28rWVF5n2aEJYhU
```

You can view the program on [Solana Explorer](https://explorer.solana.com/address/FNfJk8nYykTmKMAfyr2zjSqtrfWNR28rWVF5n2aEJYhU?cluster=devnet).

## Testing Against Devnet

To run tests against the devnet deployment:

1. Set up your Solana configuration:

   ```bash
   solana config set --url https://api.devnet.solana.com
   ```

2. Ensure you have SOL in your wallet:

   ```bash
   solana balance
   ```

3. Run the tests:
   ```bash
   yarn test
   ```

## Current Status

- **Working Features**:
  - Event creation with multiple ticket tiers ✅
- **In Progress**:
  - Whitelist functionality ❌
  - Ticket minting ❌
- **Known Issues**:
  - The whitelist functionality in the deployed program still attempts to initialize the whitelist account, which causes errors when trying to add wallets to the whitelist
  - Token program interactions for minting tickets require updates to handle associated token accounts
  - Deployment to devnet is currently experiencing issues due to network congestion

## Development Notes

- The program uses PDAs (Program Derived Addresses) for event and whitelist accounts
- Event IDs must be unique to avoid collisions
- The whitelist account is initialized during event creation
- Local code has been updated to fix issues, but deployment to devnet has been unsuccessful

## Documentation

- `NEXT_STEPS.md`: Detailed plan for next steps and current status
- `IMPLEMENTATION_NOTES.md`: Technical notes on implementation and issues encountered
- `TROUBLESHOOTING.md`: Guide for resolving common issues
- `SUMMARY.md`: Overview of project accomplishments and status

## Scripts

- `scripts/test-devnet.sh`: Run tests against devnet
- `scripts/deploy-devnet.sh`: Deploy the program to devnet with error handling
- `scripts/test-whitelist.sh`: Test whitelist functionality
- `scripts/test-mint-ticket.sh`: Test ticket minting functionality
- `scripts/test-all.sh`: Run all tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the ISC License.
