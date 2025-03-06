import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Keypair } from '@solana/web3.js';
import { expect } from 'chai';

describe("soltix whitelist", () => {
  // Configure the client to use the local validator
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // @ts-ignore
  const program = anchor.workspace.Soltix as Program<Soltix>;
  
  // Base event ID that will be made unique for each test
  const baseEventId = 'whitelist-test';
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

  // Helper function to update PDAs with new event ID
  const updatePDAs = (eventId: string) => {
    [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), Buffer.from(eventId)],
      program.programId
    );

    [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), eventPda.toBuffer()],
      program.programId
    );
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const retry = async (fn: Function, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  };

  it("Add wallet to whitelist", async () => {
    // Use timestamp to ensure unique event ID
    currentEventId = `${baseEventId}-${Date.now()}`;
    updatePDAs(currentEventId);
    
    try {
      // First create a new event
      console.log("Creating a new event for whitelist test...");
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
      
      console.log("Event and whitelist created successfully!");
      console.log("Event PDA:", eventPda.toString());
      console.log("Whitelist PDA:", whitelistPda.toString());
      
      // Generate a unique wallet for the whitelist
      const whitelistWallet = Keypair.generate();
      const tierIndex = 0; // VIP tier
      const discount = new anchor.BN(LAMPORTS_PER_SOL / 100); // 0.01 SOL discount
      
      console.log("Adding wallet to whitelist...");
      console.log("Wallet:", whitelistWallet.publicKey.toString());
      console.log("Tier Index:", tierIndex);
      console.log("Discount:", discount.toString());
      
      // Add to whitelist
      const tx = await program.methods
        .addToWhitelist(whitelistWallet.publicKey, tierIndex, discount)
        .accounts({
          organizer: provider.wallet.publicKey,
          event: eventPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Add to whitelist transaction:", tx);
      
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