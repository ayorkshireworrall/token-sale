import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN, min } from "bn.js";
import * as assert from "assert"
import { TokenSale } from "../target/types/token_sale";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
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
  const tokenHolderSeed = 'token_holder';
  const encodedTokenHolderSeed = [anchor.utils.bytes.utf8.encode(tokenHolderSeed)];

  // PDAs
  const [escrowAccountPubkey] = anchor.web3.PublicKey.findProgramAddressSync(encodedEscrowSeed, program.programId);
  const [tokenHolderPubkey] = anchor.web3.PublicKey.findProgramAddressSync(encodedTokenHolderSeed, program.programId);


  it("Is initialized!", async () => {
    const name = 'Test Escrow';
    const rate = new BN(100);
    const supply = 1000000
    const supplyBN = new BN(supply);

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

    // mint dummy token to admin account
    await mintTo(provider.connection, admin, mint, adminTokenAccount, mintAuthority, supply);


    await program.methods
      .initialize(name, rate, supplyBN)
      .accounts({
        escrow: escrowAccountPubkey,
        tokenHolder: tokenHolderPubkey,
        mint: mint,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    const escrowAccount = await program.account.escrowAccount.fetch(escrowAccountPubkey);
    assert.ok(escrowAccount.name === name);
    assert.ok(escrowAccount.exchangeRate.eq(rate));
    assert.ok(escrowAccount.totalTokenAvailability.eq(supplyBN));
    assert.ok(escrowAccount.admin.equals(provider.wallet.publicKey));
  });
});
