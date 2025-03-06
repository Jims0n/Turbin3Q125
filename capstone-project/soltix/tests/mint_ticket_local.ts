import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { 
  PublicKey, 
  LAMPORTS_PER_SOL, 
  SystemProgram, 
  Keypair 
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';
import { expect } from 'chai';

describe("soltix mint ticket local", () => {
  // Configure the client to use the local validator
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // @ts-ignore
  const program = anchor.workspace.Soltix as Program<Soltix>;
  
  // Base event ID that will be made unique for each test
  const baseEventId = 'mt-test';
  let currentEventId: string;
  
  const tiers = [
    {
      name: "VIP",
      price: new anchor.BN(LAMPORTS_PER_SOL / 10), // 0.1 SOL
      perks: "VIP Access",
      maxSupply: 100,
      minted: 0
    },
    {
      name: "General",
      price: new anchor.BN(LAMPORTS_PER_SOL / 20), // 0.05 SOL
      perks: "General Admission",
      maxSupply: 200,
      minted: 0
    }
  ];

  // PDAs and accounts
  let eventPda: PublicKey;
  let whitelistPda: PublicKey;
  let ticketMint: PublicKey;
  let buyer: Keypair;
  let buyerAta: PublicKey;
  let metadataAccount: PublicKey;
  
  // Token metadata program ID (hardcoded for devnet/mainnet)
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  beforeEach(async () => {
    // Create a new buyer for each test
    buyer = Keypair.generate();
    
    // Airdrop some SOL to the buyer
    const airdropSig = await provider.connection.requestAirdrop(
      buyer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);
  });

  it("Mint ticket for non-whitelisted user", async () => {
    // Use timestamp to ensure unique event ID but keep it short
    const timestamp = Date.now().toString().slice(-6);
    currentEventId = `${baseEventId}-${timestamp}`;
    const tierIndex = 1; // General tier
    
    // Find PDAs
    [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), Buffer.from(currentEventId)],
      program.programId
    );

    [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), eventPda.toBuffer()],
      program.programId
    );
    
    [ticketMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("ticket_mint"), eventPda.toBuffer(), Buffer.from([tierIndex])],
      program.programId
    );
    
    // Find metadata account
    metadataAccount = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        ticketMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    
    console.log("Creating event with ID:", currentEventId);
    console.log("Event PDA:", eventPda.toString());
    console.log("Whitelist PDA:", whitelistPda.toString());
    console.log("Ticket Mint:", ticketMint.toString());
    console.log("Metadata Account:", metadataAccount.toString());
    
    try {
      // Create event
      const createTx = await program.methods
        .createEvent(currentEventId, tiers)
        .accounts({
          organizer: provider.wallet.publicKey,
          event: eventPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Event creation transaction:", createTx);
      
      // Verify the event was created
      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.eventId).to.equal(currentEventId);
      
      // Get the buyer's associated token account
      buyerAta = await getAssociatedTokenAddress(
        ticketMint,
        buyer.publicKey
      );
      
      console.log("Minting ticket for non-whitelisted user...");
      console.log("Buyer:", buyer.publicKey.toString());
      console.log("Tier Index:", tierIndex);
      console.log("Buyer ATA:", buyerAta.toString());
      
      // Mint ticket
      const mintTx = await program.methods
        .mintTicket(tierIndex)
        .accounts({
          buyer: buyer.publicKey,
          buyerAta: buyerAta,
          ticketMint: ticketMint,
          event: eventPda,
          whitelist: whitelistPda,
          organizer: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          metadataAccount: metadataAccount,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer])
        .rpc();
      
      console.log("Mint ticket transaction:", mintTx);
      
      // Verify the ticket was minted
      const eventAfterMint = await program.account.event.fetch(eventPda);
      expect(eventAfterMint.tiers[tierIndex].minted).to.equal(1);
      
      console.log("Successfully minted ticket!");
      
    } catch (error) {
      console.error("Error in mint ticket test:", error);
      throw error;
    }
  });

  it("Mint ticket for whitelisted user with discount", async () => {
    // Use timestamp to ensure unique event ID but keep it short
    const timestamp = Date.now().toString().slice(-6);
    currentEventId = `${baseEventId}-wl-${timestamp}`;
    const tierIndex = 0; // VIP tier
    const discount = new anchor.BN(LAMPORTS_PER_SOL / 100); // 0.01 SOL discount
    
    // Find PDAs
    [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), Buffer.from(currentEventId)],
      program.programId
    );

    [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), eventPda.toBuffer()],
      program.programId
    );
    
    [ticketMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("ticket_mint"), eventPda.toBuffer(), Buffer.from([tierIndex])],
      program.programId
    );
    
    // Find metadata account
    metadataAccount = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        ticketMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    
    console.log("Creating event with ID:", currentEventId);
    console.log("Event PDA:", eventPda.toString());
    console.log("Whitelist PDA:", whitelistPda.toString());
    console.log("Ticket Mint:", ticketMint.toString());
    console.log("Metadata Account:", metadataAccount.toString());
    
    try {
      // Create event
      const createTx = await program.methods
        .createEvent(currentEventId, tiers)
        .accounts({
          organizer: provider.wallet.publicKey,
          event: eventPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Event creation transaction:", createTx);
      
      // Add buyer to whitelist
      console.log("Adding buyer to whitelist...");
      const addTx = await program.methods
        .addToWhitelist(buyer.publicKey, tierIndex, discount)
        .accounts({
          organizer: provider.wallet.publicKey,
          event: eventPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Add to whitelist transaction:", addTx);
      
      // Verify the whitelist entry
      const whitelistAccount = await program.account.whitelist.fetch(whitelistPda);
      const entry = whitelistAccount.fans.find(
        (e) => e.wallet.toString() === buyer.publicKey.toString()
      );
      expect(entry).to.not.be.undefined;
      
      // Get the buyer's associated token account
      buyerAta = await getAssociatedTokenAddress(
        ticketMint,
        buyer.publicKey
      );
      
      console.log("Minting ticket for whitelisted user...");
      console.log("Buyer:", buyer.publicKey.toString());
      console.log("Tier Index:", tierIndex);
      console.log("Buyer ATA:", buyerAta.toString());
      
      // Mint ticket
      const mintTx = await program.methods
        .mintTicket(tierIndex)
        .accounts({
          buyer: buyer.publicKey,
          buyerAta: buyerAta,
          ticketMint: ticketMint,
          event: eventPda,
          whitelist: whitelistPda,
          organizer: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          metadataAccount: metadataAccount,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer])
        .rpc();
      
      console.log("Mint ticket transaction:", mintTx);
      
      // Verify the ticket was minted
      const eventAfterMint = await program.account.event.fetch(eventPda);
      expect(eventAfterMint.tiers[tierIndex].minted).to.equal(1);
      
      console.log("Successfully minted ticket with discount!");
      
    } catch (error) {
      console.error("Error in whitelisted mint ticket test:", error);
      throw error;
    }
  });
}); 