import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN, min } from "bn.js";
import * as assert from "assert"
import { TokenSale } from "../target/types/token_sale";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount, getMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
const { SystemProgram } = anchor.web3;

describe("token-sale", () => {

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenSale as Program<TokenSale>;

  // set up test constants
  const name = 'Test Escrow';
  const rate = new BN(100);
  const supply = 1000000
  const supplyBN = new BN(supply);

  let mint = null as PublicKey;
  let adminTokenAccount = null as PublicKey;

  // Required Keys
  const admin = anchor.web3.Keypair.generate();


  // Known seeds
  const escrowSeed = 'escrow_pda';
  const encodedEscrowSeed = [anchor.utils.bytes.utf8.encode(escrowSeed), anchor.utils.bytes.utf8.encode(name)];

  // PDA
  const [escrowAccountPubkey] = anchor.web3.PublicKey.findProgramAddressSync(encodedEscrowSeed, program.programId);

  // PDA owned token account
  // TODO this should be derived from the seeds used in the definition, see example at https://spl.solana.com/associated-token-account#finding-the-associated-token-account-address
  let escrowTokenAccountPubkey = null;

  it("Test setup", async () => {
    // airdrop SOL to admin who will be paying
    const signature = await provider.connection.requestAirdrop(admin.publicKey, 1000000000);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      'confirmed'
    );

    // dummy token mint
    mint = await createMint(provider.connection, admin, admin.publicKey, null, 0);

    // create a token account for admin so they can hold the token minted above
    adminTokenAccount = await createAccount(provider.connection, admin, mint, admin.publicKey);

    // mint dummy token to admin account with the amount specified in supply
    await mintTo(provider.connection, admin, mint, adminTokenAccount, admin, supply);
    const mintInfo = await getMint(provider.connection, mint);
    assert.equal(supply, mintInfo.supply);
    const adminAssociatedTokenAccount = await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, admin.publicKey);
    const tokenAccountInfo = await getAccount(provider.connection, adminAssociatedTokenAccount.address);
    assert.equal(supply, tokenAccountInfo.amount);
    escrowTokenAccountPubkey = PublicKey.findProgramAddressSync(
      [
        provider.wallet.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintInfo.address.toBuffer()
      ],
      program.programId
    );
  });


  it("Can create a new escrow account!", async () => {
    await program.methods
      .initialize(supplyBN, rate, name)
      .accounts({
        escrowPda: escrowAccountPubkey,
        saleTokenAccount: escrowTokenAccountPubkey,
        adminTokenAccount: adminTokenAccount,
        mint: mint,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([admin])
      .rpc();

    const escrowAccount = await program.account.escrowAccount.fetch(escrowAccountPubkey);
    // assert.ok(escrowAccount.name === name);
    assert.ok(escrowAccount.rate.eq(rate));
    assert.ok(escrowAccount.amount.eq(supplyBN));
    // assert.ok(escrowAccount.admin.equals(provider.wallet.publicKey));
  });
});
