import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { BN } from "bn.js";

describe("soltix-devnet", () => {
  // Configure the client to use the devnet cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Soltix as Program<Soltix>;
  const wallet = provider.wallet as anchor.Wallet;

  it("Creates an event on devnet", async () => {
    // Generate a unique event ID
    const eventId = `devnet-test-${Math.floor(Math.random() * 1000000)}`;
    console.log(`Creating event with ID: ${eventId}`);

    // Find the event PDA
    const [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), Buffer.from(eventId)],
      program.programId
    );
    console.log(`Event PDA: ${eventPda.toBase58()}`);

    // Find the whitelist PDA
    const [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), eventPda.toBuffer()],
      program.programId
    );
    console.log(`Whitelist PDA: ${whitelistPda.toBase58()}`);

    // Define ticket tiers
    const tiers = [
      {
        name: "Regular",
        price: new BN(LAMPORTS_PER_SOL / 10), // 0.1 SOL
        perks: "General admission",
        maxSupply: 80,
        minted: 0
      },
      {
        name: "VIP",
        price: new BN(LAMPORTS_PER_SOL / 2), // 0.5 SOL
        perks: "Early access, VIP seating",
        maxSupply: 20,
        minted: 0
      }
    ];

    // Create the event
    const tx = await program.methods
      .createEvent(
        eventId,
        tiers
      )
      .accounts({
        event: eventPda,
        whitelist: whitelistPda,
        organizer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`Transaction signature: ${tx}`);

    // Fetch the event data to verify
    const eventAccount = await program.account.event.fetch(eventPda);
    expect(eventAccount.eventId).to.equal(eventId);
    expect(eventAccount.organizer.toBase58()).to.equal(wallet.publicKey.toBase58());
    expect(eventAccount.tiers.length).to.equal(2);
    
    console.log("Event created successfully!");
    console.log("Event details:", {
      eventId: eventAccount.eventId,
      organizer: eventAccount.organizer.toBase58(),
      tiers: eventAccount.tiers.map((tier: any, index: number) => ({
        name: tier.name,
        price: tier.price.toString(),
        perks: tier.perks,
        maxSupply: tier.maxSupply,
        minted: tier.minted
      }))
    });
  });
}); 