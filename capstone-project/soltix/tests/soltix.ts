import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { expect } from 'chai';

describe("soltix on devnet", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // @ts-ignore
  const program = anchor.workspace.Soltix as Program<Soltix>;
  
  // Base event ID that will be made unique for each test
  const baseEventId = 'test';
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
  let ticketMintPda: PublicKey;

  // Helper function to update PDAs with new event ID
  const updatePDAs = (eventId: string, tierIndex: number = 0) => {
    [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), Buffer.from(eventId)],
      program.programId
    );

    [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), eventPda.toBuffer()],
      program.programId
    );

    [ticketMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("ticket_mint"), eventPda.toBuffer(), Buffer.from([tierIndex])],
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

  it("Initialize event with tiers", async () => {
    // Use timestamp to ensure unique event ID
    currentEventId = `${baseEventId}-${Date.now()}`;
    updatePDAs(currentEventId);
    
    try {
      const tx = await retry(async () => {
        return await program.methods
          .createEvent(currentEventId, tiers)
          .accounts({
            organizer: provider.wallet.publicKey,
            event: eventPda,
            whitelist: whitelistPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      });

      console.log("Create Event Transaction:", tx);

      // Wait for confirmation and fetch the created event
      await provider.connection.confirmTransaction(tx);
      
      // @ts-ignore
      const eventAccount = await program.account.event.fetch(eventPda);
      
      expect(eventAccount.eventId).to.equal(currentEventId);
      expect(eventAccount.organizer.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(eventAccount.tiers.length).to.equal(2);
      expect(eventAccount.tiers[0].price.toString()).to.equal((LAMPORTS_PER_SOL / 10).toString());
      expect(eventAccount.tiers[1].price.toString()).to.equal((LAMPORTS_PER_SOL / 20).toString());
      
      // Verify the whitelist was created
      const whitelistAccount = await program.account.whitelist.fetch(whitelistPda);
      expect(whitelistAccount.eventId).to.equal(currentEventId);
      expect(whitelistAccount.fans.length).to.equal(0);
      
      console.log("Successfully created event and whitelist on devnet!");
      console.log("Event PDA:", eventPda.toString());
      console.log("Whitelist PDA:", whitelistPda.toString());
      
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  });
});
