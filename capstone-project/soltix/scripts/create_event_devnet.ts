import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Soltix } from "../target/types/soltix";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { BN } from "bn.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Load keypair from the default Solana CLI config location
const keypairPath = path.resolve(os.homedir(), ".config", "solana", "id.json");
const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

// Configure the connection to use the devnet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

// Set the program ID to the deployed program
const programId = new PublicKey("AY7npdHaC7Sx4tfbKhbw4NHsLasz8Qm4E8h9H4GvVYy6");

async function main() {
  // Generate a unique event ID
  const eventId = `devnet-script-${Math.floor(Math.random() * 1000000)}`;
  console.log(`Creating event with ID: ${eventId}`);
  console.log(`Using wallet: ${wallet.publicKey.toBase58()}`);

  // Find the event PDA
  const [eventPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("event"), Buffer.from(eventId)],
    programId
  );
  console.log(`Event PDA: ${eventPda.toBase58()}`);

  // Find the whitelist PDA
  const [whitelistPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("whitelist"), eventPda.toBuffer()],
    programId
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

  try {
    // Load the IDL from the deployed program
    const idl = await anchor.Program.fetchIdl(programId, provider);
    if (!idl) {
      throw new Error("IDL not found for the program");
    }

    // Create a program instance
    const program = new anchor.Program(idl, programId, provider) as Program<Soltix>;

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
    console.log(`Transaction URL: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Fetch the event data to verify
    const eventAccount = await program.account.event.fetch(eventPda);
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
  } catch (error) {
    console.error("Error creating event:", error);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
); 