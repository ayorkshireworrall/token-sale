import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import * as assert from "assert"
const { SystemProgram } = anchor.web3;
import { TokenSale } from "../target/types/token_sale";

describe("token-sale", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenSale as Program<TokenSale>;

  it("Is initialized!", async () => {
    const name = 'Test Escrow'
    const rate = new BN(100)
    const supply = new BN(1000000)
    const [escrowAccountPubkey] = anchor.web3.PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode('escrow')],
      program.programId
    );
    await program.methods
      .initialize(name, rate, supply)
      .accounts({
        escrow: escrowAccountPubkey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    const escrowAccount = await program.account.escrowAccount.fetch(escrowAccountPubkey);
    assert.ok(escrowAccount.name === name);
    assert.ok(escrowAccount.exchangeRate.eq(rate));
    assert.ok(escrowAccount.totalTokenAvailability.eq(supply));
    assert.ok(escrowAccount.admin.equals(provider.wallet.publicKey));
  });
});
