import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Keypair } from '@solana/web3.js';
import { expect } from 'chai';

describe("soltix whitelist local", () => {
  // Configure the client to use the local validator
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // @ts-ignore
  const program = anchor.workspace.Soltix as Program<Soltix>;
  
  // Base event ID that will be made unique for each test
  const baseEventId = 'wl-test';
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

  // PDAs
  let eventPda: PublicKey;
  let whitelistPda: PublicKey;

  it("Add wallet to whitelist", async () => {
    // Use timestamp to ensure unique event ID but keep it short
    const timestamp = Date.now().toString().slice(-6);
    currentEventId = `${baseEventId}-${timestamp}`;
    
    // Find PDAs
    [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), Buffer.from(currentEventId)],
      program.programId
    );

    [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), eventPda.toBuffer()],
      program.programId
    );
    
    console.log("Creating event with ID:", currentEventId);
    console.log("Event PDA:", eventPda.toString());
    console.log("Whitelist PDA:", whitelistPda.toString());
    
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
      
      // Verify the whitelist was created
      const whitelistAccount = await program.account.whitelist.fetch(whitelistPda);
      expect(whitelistAccount.eventId).to.equal(currentEventId);
      expect(whitelistAccount.fans.length).to.equal(0);
      
      console.log("Successfully created event and whitelist!");
      
      // Generate a wallet for the whitelist
      const whitelistWallet = Keypair.generate();
      const tierIndex = 0; // VIP tier
      const discount = new anchor.BN(LAMPORTS_PER_SOL / 100); // 0.01 SOL discount
      
      console.log("Adding wallet to whitelist...");
      console.log("Wallet:", whitelistWallet.publicKey.toString());
      console.log("Tier Index:", tierIndex);
      console.log("Discount:", discount.toString());
      
      // Add to whitelist
      const addTx = await program.methods
        .addToWhitelist(whitelistWallet.publicKey, tierIndex, discount)
        .accounts({
          organizer: provider.wallet.publicKey,
          event: eventPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Add to whitelist transaction:", addTx);
      
      // Verify the whitelist entry
      const updatedWhitelistAccount = await program.account.whitelist.fetch(whitelistPda);
      expect(updatedWhitelistAccount.fans.length).to.equal(1);
      
      // Find our entry
      const entry = updatedWhitelistAccount.fans.find(
        (e) => e.wallet.toString() === whitelistWallet.publicKey.toString()
      );
      
      expect(entry).to.not.be.undefined;
      expect(entry.tierIndex).to.equal(tierIndex);
      expect(entry.discount.toString()).to.equal(discount.toString());
      
      console.log("Successfully added wallet to whitelist!");
      
    } catch (error) {
      console.error("Error in whitelist test:", error);
      throw error;
    }
  });
}); 