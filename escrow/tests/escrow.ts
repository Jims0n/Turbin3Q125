import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { BN } from "bn.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createInitializeMint2Instruction, createMint, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { randomBytes } from "crypto";
import { confirmTransaction } from "@solana-developers/helpers";


const programId = new PublicKey("A2rhTqfm2uHyChiDurS66FUV42fURpkWHeGus7qRQDLq");

describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const connection = provider.connection;

  const program = anchor.workspace.Escrow as Program<Escrow>;

  const maker = anchor.web3.Keypair.generate();
  const taker = anchor.web3.Keypair.generate();

  const seed = new BN(randomBytes(8));
  const receive_amount = 1;
  const deposit_amount = 1;


  let [escrow, escrow_bump] = PublicKey.findProgramAddressSync([
    Buffer.from("escrow"),
    maker.publicKey.toBuffer(),
    seed.toArrayLike(Buffer, 'le', 8),
  ],
  programId
);
 
let vault;
let mintA;
let mintB;
let makerAtaA;
let takerAtaA;

before(
  "Create Accounts",
  async () => {
    let airdrop1 = await provider.connection.requestAirdrop(maker.publicKey, 2 * LAMPORTS_PER_SOL);
    let airdrop1_tx = await confirmTransaction(connection, airdrop1, "confirmed");
    console.log("Airdrop 1:", airdrop1_tx);
    
    let airdrop2 = await provider.connection.requestAirdrop(taker.publicKey, 2 * LAMPORTS_PER_SOL);
    let airdrop2_tx = await confirmTransaction(connection, airdrop2, "confirmed");
    console.log("Airdrop 1:", airdrop2_tx);

    // create token mint that would be used to create escrow
    mintA = await createMint(
      connection,
      maker,
      maker.publicKey,
      null,
      6,
    );
    console.log("MintA Address:", mintA);

    mintB = await createMint(
      connection,
      taker,
      taker.publicKey,
      null,
      6,
    );
    console.log("MintB Address:", mintB);
    
    makerAtaA = await getOrCreateAssociatedTokenAccount(
      connection,
      maker,
      mintA,
      maker.publicKey,
    );
    console.log("Maker ATA A: ", makerAtaA.address);
    
    takerAtaA = await getOrCreateAssociatedTokenAccount(
      connection,
      taker,
      mintB,
      taker.publicKey,
    );
    console.log("Taker ATA B: ", takerAtaA.address);

    // mint token A to maker and token B to taker
      let mint1_tx = await mintTo(connection, maker, mintA, makerAtaA.address, maker, 10000 * 10 ** 6);
      console.log("Mint 1 Tx: ", mint1_tx);

      let mint2_tx = await mintTo(connection, taker, mintB, takerAtaA.address, taker, 20000 * 10 ** 6);
      console.log("Mint 2 Tx: ", mint2_tx);   
      
      vault = getAssociatedTokenAddress(
        mintA,
        escrow,
        true,
        TOKEN_PROGRAM_ID,
      )
      console.log("Vault Address:", vault);
  }
)

  it("lets make an escrow!", async () => {
    // Add your test here.
 await program.methods.make(seed, new BN(receive_amount), new BN(deposit_amount)).accountsPartial({
        maker: maker.publicKey,
        mintA,
        mintB,
        makerMintAAta: makerAtaA,
        vault,
        escrow,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).signers([maker]).rpc();
    
  });
});
