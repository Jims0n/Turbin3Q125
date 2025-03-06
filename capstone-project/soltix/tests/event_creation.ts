import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';

describe("soltix event creation", () => {
  // Configure the client to use the local validator
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // @ts-ignore
  const program = anchor.workspace.Soltix as Program<Soltix>;
  
  // Base event ID that will be made unique for each test
  const baseEventId = 'local-test';
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

  it("Initialize event with tiers", async () => {
    // Use timestamp to ensure unique event ID
    currentEventId = `${baseEventId}-${Date.now()}`;
    
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
      const tx = await program.methods
        .createEvent(currentEventId, tiers)
        .accounts({
          organizer: provider.wallet.publicKey,
          event: eventPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Event creation transaction:", tx);
      
      // Verify the event was created
      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.eventId).to.equal(currentEventId);
      expect(eventAccount.organizer.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(eventAccount.tiers.length).to.equal(tiers.length);
      
      // Verify the whitelist was created
      const whitelistAccount = await program.account.whitelist.fetch(whitelistPda);
      expect(whitelistAccount.eventId).to.equal(currentEventId);
      expect(whitelistAccount.fans.length).to.equal(0);
      
      console.log("Successfully created event and whitelist!");
      
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  });
}); 