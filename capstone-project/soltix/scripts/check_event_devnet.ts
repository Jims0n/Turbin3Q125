import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Soltix } from "../target/types/soltix";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("AY7npdHaC7Sx4tfbKhbw4NHsLasz8Qm4E8h9H4GvVYy6");
  const eventId = "devnet-script-49380";
  
  const [eventPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("event"), Buffer.from(eventId)],
    programId
  );
  
  // Create a dummy keypair for the provider
  const dummyWallet = Keypair.generate();
  
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(dummyWallet),
    { commitment: "confirmed" }
  );
  
  const idl = await anchor.Program.fetchIdl(programId, provider);
  
  const program = new anchor.Program(idl, programId, provider) as Program<Soltix>;
  
  const eventAccount = await program.account.event.fetch(eventPda);
  console.log("Event:", {
    eventId: eventAccount.eventId,
    organizer: eventAccount.organizer.toString(),
    tiers: eventAccount.tiers.map((tier: any) => ({
      name: tier.name,
      price: tier.price.toString(),
      maxSupply: tier.maxSupply.toString(),
      minted: tier.minted.toString()
    }))
  });
}

main().catch(console.error); 