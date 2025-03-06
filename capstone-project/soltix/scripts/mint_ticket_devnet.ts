import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL, 
  Connection, 
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
  getMint
} from "@solana/spl-token";
import { BN } from "bn.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Load the keypair from the default Solana CLI config location
const keypairPath = path.resolve(os.homedir(), ".config", "solana", "id.json");
const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
const wallet = Keypair.fromSecretKey(secretKey);

// Configure the connection to the devnet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Define the event ID to use
const eventId = "devnet-script-49380";

// Define the tier index (0 for Regular, 1 for VIP)
const tierIndex = 0;

async function main() {
  try {
    // Initialize Anchor provider and program
    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(wallet),
      { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    const program = anchor.workspace.Soltix as Program<Soltix>;

    // Create a new keypair for the fan wallet
    const fanWallet = Keypair.generate();
    console.log(`Minting ticket for event: ${eventId}`);
    console.log(`For wallet: ${fanWallet.publicKey.toString()}`);

    // Find the event PDA
    const [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), Buffer.from(eventId)],
      program.programId
    );
    console.log(`Event PDA: ${eventPda.toString()}`);

    // Get the event data to find the organizer
    const eventAccount = await program.account.event.fetch(eventPda);
    const organizer = eventAccount.organizer;
    console.log(`Organizer: ${organizer.toString()}`);

    // Find the whitelist PDA
    const [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), eventPda.toBuffer()],
      program.programId
    );
    console.log(`Whitelist PDA: ${whitelistPda.toString()}`);

    // Fund the fan wallet with 0.5 SOL
    console.log(`Funding fan wallet with 0.5 SOL...`);
    const fundTx = await connection.requestAirdrop(fanWallet.publicKey, 0.5 * anchor.web3.LAMPORTS_PER_SOL);
    console.log(`Fund transaction: ${fundTx}`);
    await connection.confirmTransaction(fundTx);

    // Check fan wallet balance
    const balance = await connection.getBalance(fanWallet.publicKey);
    console.log(`Fan wallet balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);

    // Add fan wallet to whitelist
    try {
      console.log(`Adding fan wallet to whitelist...`);
      await program.methods
        .addToWhitelist(fanWallet.publicKey, tierIndex, new anchor.BN(0)) // Fix parameters: wallet, tierIndex, discount
        .accounts({
          event: eventPda,
          whitelist: whitelistPda,
          organizer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([wallet])
        .rpc();
    } catch (e) {
      console.error(`Error adding to whitelist: ${e}`);
      console.log(`Continuing without whitelist...`);
    }

    // Find the ticket mint PDA
    const [ticketMintPda, ticketMintBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("ticket_mint"), eventPda.toBuffer(), Buffer.from([tierIndex])],
      program.programId
    );
    console.log(`Ticket mint PDA: ${ticketMintPda.toString()}`);

    // Get the buyer's associated token account
    const buyerAta = await getAssociatedTokenAddress(
      ticketMintPda,
      fanWallet.publicKey
    );
    console.log(`Buyer ATA: ${buyerAta.toString()}`);

    // Get the metadata account
    const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        ticketMintPda.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );
    console.log(`Metadata account: ${metadataAccount.toString()}`);

    // Mint the ticket
    console.log(`Minting ticket...`);
    await program.methods
      .mintTicket(tierIndex)
      .accounts({
        event: eventPda,
        whitelist: whitelistPda,
        buyer: fanWallet.publicKey,
        ticketMint: ticketMintPda,
        buyerAta: buyerAta,
        metadataAccount: metadataAccount,
        organizer: organizer, // Use the organizer from the event account
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: METADATA_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([fanWallet, wallet]) // Include both the fan wallet and our wallet (which should be the organizer)
      .rpc();

    console.log(`Successfully minted ticket for event ${eventId}!`);
    console.log(`Ticket mint: ${ticketMintPda.toString()}`);
    console.log(`Buyer ATA: ${buyerAta.toString()}`);

  } catch (error) {
    console.error(`Error minting ticket: ${error}`);
  }
}

main();