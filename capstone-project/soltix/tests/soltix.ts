import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { expect } from 'chai';

describe("soltix", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // @ts-ignore
  const program = anchor.workspace.Soltix as Program<Soltix>;
  
  // Test event details
  const eventId = "test-event-1";
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

  before(async () => {
    // Find PDAs
    [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), Buffer.from(eventId)],
      program.programId
    );

    [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), eventPda.toBuffer()],
      program.programId
    );
  });

  it("Initialize event with tiers", async () => {
    try {
      const tx = await program.methods
        .createEvent(eventId, tiers)
        .accounts({
          organizer: provider.wallet.publicKey,
          event: eventPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Create Event Transaction:", tx);

      // Fetch and verify the created event
      // @ts-ignore
      const eventAccount = await program.account.event.fetch(eventPda);
      
      expect(eventAccount.eventId).to.equal(eventId);
      expect(eventAccount.organizer.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(eventAccount.tiers.length).to.equal(2);
      expect(eventAccount.tiers[0].price.toString()).to.equal((LAMPORTS_PER_SOL / 10).toString());
      expect(eventAccount.tiers[1].price.toString()).to.equal((LAMPORTS_PER_SOL / 20).toString());
      
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  });

  it("Add wallet to whitelist", async () => {
    // Create a test wallet to add to whitelist
    const fanWallet = anchor.web3.Keypair.generate();
    const tierIndex = 0; // VIP tier
    const discount = new anchor.BN(LAMPORTS_PER_SOL / 100); // 0.01 SOL discount

    try {
      const tx = await program.methods
        .addToWhitelist(fanWallet.publicKey, tierIndex, discount)
        .accounts({
          organizer: provider.wallet.publicKey,
          event: eventPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Add to Whitelist Transaction:", tx);

      // Fetch and verify the whitelist
      // @ts-ignore
      const whitelistAccount = await program.account.whitelist.fetch(whitelistPda);
      
      const whitelistedFan = whitelistAccount.fans.find(
        (fan: { wallet: PublicKey; tierIndex: number; discount: anchor.BN }) => 
          fan.wallet.toString() === fanWallet.publicKey.toString()
      );

      expect(whitelistedFan).to.exist;
      expect(whitelistedFan?.tierIndex).to.equal(tierIndex);
      expect(whitelistedFan?.discount.toString()).to.equal(discount.toString());

    } catch (error) {
      console.error("Error adding to whitelist:", error);
      throw error;
    }
  });

  it("Mint ticket for non-whitelisted user", async () => {
    const tierIndex = 1; // General admission tier
    const buyer = anchor.web3.Keypair.generate();
    
    // Airdrop some SOL to the buyer
    const signature = await provider.connection.requestAirdrop(
      buyer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    try {
      // Find ticket mint PDA
      [ticketMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket_mint"), eventPda.toBuffer(), Buffer.from([tierIndex])],
        program.programId
      );

      // Get the associated token account for the buyer
      const buyerAta = await anchor.utils.token.associatedAddress({
        mint: ticketMintPda,
        owner: buyer.publicKey
      });

      const tx = await program.methods
        .mintTicket(tierIndex)
        .accounts({
          event: eventPda,
          whitelist: whitelistPda,
          buyer: buyer.publicKey,
          buyerAta: buyerAta,
          ticketMint: ticketMintPda,
          metadataAccount: PublicKey.default, // We're not implementing metadata in this test
          organizer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: PublicKey.default, // We're not implementing metadata in this test
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer])
        .rpc();

      console.log("Mint Ticket Transaction:", tx);

      // Fetch and verify the event state
      // @ts-ignore
      const eventAccount = await program.account.event.fetch(eventPda);
      expect(eventAccount.tiers[tierIndex].minted.toString()).to.equal("1");

      // Verify the buyer received the token
      const tokenAccount = await provider.connection.getTokenAccountBalance(buyerAta);
      expect(tokenAccount.value.amount).to.equal("1");

    } catch (error) {
      console.error("Error minting ticket:", error);
      throw error;
    }
  });
});
