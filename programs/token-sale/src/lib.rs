use anchor_lang::prelude::*;
use anchor_spl::token::{
    self, spl_token::instruction::transfer, spl_token::instruction::AuthorityType, Mint,
    SetAuthority, Token, TokenAccount, Transfer,
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_sale {
    use anchor_lang::solana_program::program::invoke;

    use super::*;

    /// Used by the admin user to create an escrow account holding tokens
    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_pda;
        let bump = *ctx
            .bumps
            .get("escrow_pda")
            .ok_or(TokenSaleError::CannotGetEscrowBump)?;

        escrow.bump = bump;

        // let depositing_account = &mut ctx.accounts.admin_token_account.key(); // the admin's token account from which tokens will be transferred
        // let sender = &ctx.accounts.admin; // the admin's wallet used for signing the transaction
        // let bump_vector = bump.to_le_bytes();
        // let inner_seeds = vec![
        //     sender.key.as_ref(),
        //     depositing_account.as_ref(),
        //     "escrow_pda".as_ref(),
        //     bump_vector.as_ref(),
        // ];
        // let outer_seeds = vec![inner_seeds.as_slice()];

        // let ix = Transfer {
        //     from: ctx.accounts.admin_token_account.to_account_info(),
        //     to: ctx.accounts.sale_token_account.to_account_info(),
        //     authority: sender.to_account_info(),
        // };

        // let cpi_ctx = CpiContext::new_with_signer(
        //     ctx.accounts.token_program.to_account_info(),
        //     ix,
        //     outer_seeds.as_slice(),
        // );

        // anchor_spl::token::transfer(cpi_ctx, amount)?;
        // escrow.amount = amount;

        // let ix = transfer(
        //     &ctx.accounts.token_program.key, // the token program key (for )
        //     &ctx.accounts.admin_token_account.to_account_info().key,
        //     &ctx.accounts.sale_token_account.to_account_info().key,
        //     &ctx.accounts.admin_token_account.to_account_info().key,
        //     &[],
        //     amount,
        // )?;

        // let transfer_result = invoke(
        //     &ix,
        //     &[
        //         ctx.accounts.admin_token_account.to_account_info(),
        //         ctx.accounts.sale_token_account.to_account_info(),
        //         ctx.accounts.token_program.to_account_info(),
        //         ctx.accounts.system_program.to_account_info(),
        //     ],
        // );

        let cpi_accounts = Transfer {
            from: ctx.accounts.admin_token_account.to_account_info(),
            to: ctx.accounts.sale_token_account.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

        let transfer_result = token::transfer(cpi_ctx, amount);

        Ok(transfer_result?)
    }

    /// Used by the admin user to cancel an existing escrow account holding tokens
    pub fn cancel(ctx: Context<Cancel>, _name: String) -> Result<()> {
        Ok(())
    }

    /// Used by the end user to send SOL to the escrow account and retrieve tokens
    pub fn exchange(ctx: Context<Exchange>, _name: String) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(supply: u64)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        seeds=[b"escrow_pda".as_ref()],
        bump,
        space=200
    )]
    pub escrow_pda: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = admin_token_account.amount >= supply
    )]
    pub admin_token_account: Account<'info, TokenAccount>, // the token account of the admin who is creating the token sale (should already exist)
    #[account(
        init,
        seeds = [b"escrow_token_account".as_ref()],
        bump,
        payer = admin,
        token::mint = mint,
        token::authority = escrow_pda,
    )]
    pub sale_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Cancel<'info> {
    pub admin: Signer<'info>,
    // TODO
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Exchange<'info> {
    pub user: Signer<'info>,
    // TODO
}

#[account]
pub struct EscrowAccount {
    pub amount: u64,
    pub bump: u8,
}

#[error_code]
pub enum TokenSaleError {
    #[msg("Unable to get escrow bump")]
    CannotGetEscrowBump,
}
