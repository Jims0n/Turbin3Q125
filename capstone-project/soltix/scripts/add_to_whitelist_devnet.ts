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

// Use the event ID from the previous script
const eventId = "devnet-script-49380";

async function main() {
  console.log(`Adding wallet to whitelist for event: ${eventId}`);
  console.log(`Using organizer wallet: ${wallet.publicKey.toBase58()}`);

  // Generate a random wallet to add to the whitelist
  const fanWallet = Keypair.generate();
  console.log(`Fan wallet to add: ${fanWallet.publicKey.toBase58()}`);

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

  try {
    // Load the IDL from the deployed program
    const idl = await anchor.Program.fetchIdl(programId, provider);
    if (!idl) {
      throw new Error("IDL not found for the program");
    }

    // Create a program instance
    const program = new anchor.Program(idl, programId, provider) as Program<Soltix>;

    // Add the wallet to the whitelist
    const tierIndex = 0; // Regular tier
    const discount = new BN(LAMPORTS_PER_SOL / 100); // 0.01 SOL discount
    
    const tx = await program.methods
      .addToWhitelist(
        fanWallet.publicKey,
        tierIndex,
        discount
      )
      .accounts({
        event: eventPda,
        whitelist: whitelistPda,
        organizer: wallet.publicKey,
      })
      .rpc();

    console.log(`Transaction signature: ${tx}`);
    console.log(`Transaction URL: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Fetch the whitelist data to verify
    const whitelistAccount = await program.account.whitelist.fetch(whitelistPda);
    console.log("Wallet added to whitelist successfully!");
    console.log("Whitelist details:", {
      eventId: whitelistAccount.eventId,
      fans: whitelistAccount.fans.map((fan: any) => ({
        wallet: fan.wallet.toBase58(),
        tierIndex: fan.tierIndex,
        discount: fan.discount.toString()
      }))
    });
  } catch (error) {
    console.error("Error adding to whitelist:", error);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
); 