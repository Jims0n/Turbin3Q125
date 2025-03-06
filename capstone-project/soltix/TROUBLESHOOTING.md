# Troubleshooting Guide for Soltix

This guide provides solutions for common issues you might encounter when working with the Soltix project.

## Deployment Issues

### Error: "Write transactions failed"

**Problem**: When running `anchor deploy` or `yarn deploy`, you see an error like "128 write transactions failed".

**Solutions**:

1. **Try a different RPC endpoint**:

   ```bash
   solana config set --url https://devnet.genesysgo.net
   # or
   solana config set --url https://api.devnet.rpcpool.com
   ```

2. **Deploy during off-peak hours**:
   Devnet can be congested during peak hours. Try deploying early in the morning or late at night.

3. **Create a new program ID**:
   ```bash
   solana-keygen new -o target/deploy/soltix-keypair.json
   ```
   Then update the program ID in `lib.rs` and rebuild.

### Error: "Insufficient funds for fee"

**Problem**: Not enough SOL to pay for transaction fees.

**Solution**: Request SOL from the devnet faucet:

```bash
solana airdrop 2
```

## Whitelist Issues

### Error: "Account address already in use"

**Problem**: When adding a wallet to the whitelist, you get an error about the account address already being in use.

**Solutions**:

1. **Verify the whitelist account exists**:

   ```bash
   solana account <WHITELIST_PDA>
   ```

2. **Create a new event with a unique ID**:
   Each event should have a unique ID to avoid collisions.

3. **Redeploy the program**:
   The deployed program might be using an older version that tries to initialize the whitelist account again.

### Error: "Duplicate whitelist entry"

**Problem**: Trying to add the same wallet to the whitelist multiple times.

**Solution**: Check if the wallet is already whitelisted before adding it again.

## Mint Ticket Issues

### Error: "AccountNotInitialized"

**Problem**: When minting a ticket, you get an error about the buyer's associated token account not being initialized.

**Solution**: The updated code now initializes the associated token account automatically. Make sure you're using the latest version of the program.

### Error: "Incorrect program ID for instruction"

**Problem**: When minting a ticket, you get an error about using the wrong program ID.

**Solutions**:

1. **Verify the token program ID**:
   Make sure you're using the correct token program ID in your tests:

   ```typescript
   const TOKEN_PROGRAM_ID = new PublicKey(
     "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   );
   ```

2. **Check the metadata program ID**:
   Make sure you're using the correct metadata program ID in your tests:
   ```typescript
   const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
     "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
   );
   ```

## Test Issues

### Error: "Failed to get recent blockhash"

**Problem**: When running tests, you get an error about failing to get the recent blockhash.

**Solutions**:

1. **Check your internet connection**:
   Make sure you have a stable internet connection.

2. **Try a different RPC endpoint**:

   ```bash
   solana config set --url https://devnet.genesysgo.net
   # or
   solana config set --url https://api.devnet.rpcpool.com
   ```

3. **Increase the timeout**:
   Update the timeout in your test command:
   ```bash
   ts-mocha -p ./tsconfig.json tests/**/*.ts --timeout 180000
   ```

### Error: "Transaction simulation failed"

**Problem**: When running tests, you get an error about transaction simulation failing.

**Solutions**:

1. **Check the logs**:
   Look at the logs to understand why the transaction failed.

2. **Use the retry mechanism**:
   The test suite includes a retry mechanism to handle transient errors. Make sure you're using it:
   ```typescript
   const tx = await retry(async () => {
     return await program.methods...
   });
   ```

## General Issues

### Error: "Program log: Instruction: X"

**Problem**: When running a transaction, you get a generic error with "Program log: Instruction: X".

**Solution**: This is a generic error. Look at the full logs to understand the specific issue. You can enable more verbose logging:

```bash
solana config set --log-level debug
```

### Error: "Custom program error: 0x1770"

**Problem**: When running a transaction, you get a custom program error code.

**Solution**: These are custom error codes from the program. Look at the `errors.rs` file to understand what each code means. For example, `0x1770` corresponds to error code `6000`, which is `Unauthorized`.

## Still Having Issues?

If you're still experiencing issues after trying these solutions, please:

1. **Check the logs**: Enable verbose logging to get more information.
2. **Review the code**: Make sure your code matches the latest version.
3. **Create a new issue**: If you believe you've found a bug, create a new issue with detailed steps to reproduce it.
