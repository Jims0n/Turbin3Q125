import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, PublicKey } from "@solana/web3.js";
import wallet from "./dev-wallet.json";

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

const to = new PublicKey("7PSsqiPh7DMPacRJUSkVRUfCciUT4Sr3zGKd516Kosxn");

const connection = new Connection("https://api.devnet.solana.com");


const transfer = async () => {
    try {
        
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: to,
                lamports: LAMPORTS_PER_SOL/10,
            })
        );
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
        transaction.feePayer = keypair.publicKey;

        //Sign transaction, broadcast, ans confirm
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair]
        );
        console.log(`Success! Check out your TX here:
            https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (error) {
        console.error(`Oops, something went wrong: ${error}`)
    }
}
//transfer()

const emptyWallet = async () => {
    try {
        // Get balance of dev wallet
        const balance = await connection.getBalance(keypair.publicKey)

        // Create a test transaction to calculate fees
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: to,
                lamports: balance,
            })
        );
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
        transaction.feePayer = keypair.publicKey;

        // Calculate exact fee rate to transfer entire SOL amount out of account minus fees
        const fee = (await connection.getFeeForMessage(transaction.compileMessage(), 'confirmed')).value || 0;

        // Remove our transfer instruction to replace it 
        transaction.instructions.pop();

        // Now add the instruction back with correct amount of lamports
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: to,
                lamports: balance - fee,
            })
        )

        //Sign transaction, broadcast, ans confirm
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair]
        );
        console.log(`Success! Check out your TX here:
            https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (error) {
        console.error(`Oops, something went wrong: ${error}`)
    }
}

emptyWallet()