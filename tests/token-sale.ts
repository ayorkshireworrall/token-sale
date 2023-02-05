import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
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

  let mint = null as PublicKey;
  let adminTokenAccount = null as PublicKey;

  // Required Keys
  const admin = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();

  // Known seeds
  const escrowSeed = 'escrow';
  const encodedEscrowSeed = [anchor.utils.bytes.utf8.encode(escrowSeed)];
  const escrowTokenAccountSeed = 'escrow_token_account';
  const encodedEscrowTokenAccountSeed = [anchor.utils.bytes.utf8.encode(escrowTokenAccountSeed)];

  // PDAs
  const [escrowAccountPubkey] = anchor.web3.PublicKey.findProgramAddressSync(encodedEscrowSeed, program.programId);
  const [escrowTokenAccountPubkey] = anchor.web3.PublicKey.findProgramAddressSync(encodedEscrowTokenAccountSeed, program.programId);

  const name = 'Test Escrow';
  const rate = new BN(100);
  const supply = 1000000
  const supplyBN = new BN(supply);

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
    mint = await createMint(provider.connection, admin, mintAuthority.publicKey, null, 0);

    // create a token account for admin so they can hold the token minted above
    adminTokenAccount = await createAccount(provider.connection, admin, mint, admin.publicKey);

    // mint dummy token to admin account with the amount specified in supply
    await mintTo(provider.connection, admin, mint, adminTokenAccount, mintAuthority, supply);
    const mintInfo = await getMint(provider.connection, mint);
    assert.equal(supply, mintInfo.supply);
    const adminAssociatedTokenAccount = await getOrCreateAssociatedTokenAccount(provider.connection, admin, mint, admin.publicKey);
    const tokenAccountInfo = await getAccount(provider.connection, adminAssociatedTokenAccount.address);
    assert.equal(supply, tokenAccountInfo.amount);
  })


  it("Can create a new escrow account!", async () => {
    await program.methods
      .initialize(supplyBN)
      .accounts({
        escrowPda: escrowAccountPubkey,
        saleTokenAccount: escrowTokenAccountPubkey,
        adminTokenAccount: adminTokenAccount,
        mint: mint,
        admin: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    const escrowAccount = await program.account.escrowAccount.fetch(escrowAccountPubkey);
    // assert.ok(escrowAccount.name === name);
    // assert.ok(escrowAccount.exchangeRate.eq(rate));
    // assert.ok(escrowAccount.totalTokenAvailability.eq(supplyBN));
    // assert.ok(escrowAccount.admin.equals(provider.wallet.publicKey));
  });
});
