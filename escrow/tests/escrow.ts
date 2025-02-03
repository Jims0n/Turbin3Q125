import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { BN } from "bn.js";
import { MINT_SIZE, TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createInitializeMint2Instruction, getMinimumBalanceForRentExemptMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.Escrow as Program<Escrow>;
  const maker = anchor.web3.Keypair.generate();
  const taker = anchor.web3.Keypair.generate();
  const mintA = anchor.web3.Keypair.generate();
  const mintB = anchor.web3.Keypair.generate();
  const seed = new anchor.BN(1);
  const tokenProgram = TOKEN_2022_PROGRAM_ID
  const makerAtaA = getOrCreateAssociatedTokenAccount(maker.publicKey, mintA.publicKey, false, tokenProgram );
  const [escrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.publicKey.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  )
  const vault = getOrCreateAssociatedTokenAccount(mintA.publicKey, escrow, true, tokenProgram)

    it("airdrp",async () => {
      let lamports = await getMinimumBalanceForRentExemptMint(program.provider.connection);
      let tx = new anchor.web3.Transaction()
      tx.instructions = [
        SystemProgram.transfer({
          fromPubkey: program.provider.publicKey,
          toPubkey: maker.publicKey,
          lamports: 0.2 * LAMPORTS_PER_SOL,
        }),
        SystemProgram.transfer({
          fromPubkey: program.provider.publicKey,
          toPubkey: taker.publicKey,
          lamports: 0.2 * LAMPORTS_PER_SOL,
        }),
        SystemProgram.createAccount({
          fromPubkey: program.provider.publicKey,
          newAccountPubkey: mintA.publicKey,
          lamports,
          space: MINT_SIZE,
          programId: tokenProgram
        }),
        SystemProgram.createAccount({
          fromPubkey: program.provider.publicKey,
          newAccountPubkey: mintB.publicKey,
          lamports,
          space: MINT_SIZE,
          programId: tokenProgram
        }),
        createInitializeMint2Instruction(mintA.publicKey, 6, maker.publicKey, null, tokenProgram),
        createAssociatedTokenAccountIdempotentInstruction(provider.publicKey, makerAtaA, maker.publicKey, mintA.publicKey, tokenProgram),

        createInitializeMint2Instruction(mintB.publicKey, 6, taker.publicKey, null, tokenProgram),
        createAssociatedTokenAccountIdempotentInstruction(provider.publicKey, makerAtaA, maker.publicKey, mintA.publicKey, tokenProgram),
      ];

      await provider.sendAndConfirm(tx, [maker, taker, mintA, mintB])
    })

  it("lets make an escrow!", async () => {
    // Add your test here.

   const accounts = {
        maker: maker.publicKey,
        mintA: mintA.publicKey,
        mintB: mintB.publicKey,
        makerAtaA,
        escrow,
        vault,
        //system_program,
        //associated_token_program,
        tokenProgram
   }

    const tx = await program.methods.make(
        new BN(1),
        new BN(1),
        new BN(1),
    )
    .accountsPartial({})
    .rpc();
    console.log("Your transaction signature", tx);
  });
});
