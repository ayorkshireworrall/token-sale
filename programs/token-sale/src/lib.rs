use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("FZt4b6KyKDxHiF1bh8Jyv577J5jMWFhrdXddBoH8oB27");

#[program]
pub mod token_sale {

    use anchor_spl::token::CloseAccount;

    use super::*;

    /// Used by the admin user to create an escrow account holding tokens
    pub fn initialize(
        ctx: Context<Initialize>,
        amount: u64,
        rate: u64,
        name: String,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_pda;
        let bump = *ctx
            .bumps
            .get("escrow_pda")
            .ok_or(TokenSaleError::CannotGetEscrowBump)?;

        escrow.bump = bump;

        let cpi_accounts = Transfer {
            from: ctx.accounts.admin_token_account.to_account_info(),
            to: ctx.accounts.sale_token_account.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

        let transfer_result = token::transfer(cpi_ctx, amount);
        escrow.amount = amount;
        escrow.rate = rate;
        escrow.name = name;

        Ok(transfer_result?)
    }

    /// Used by the admin user to cancel an existing escrow account holding tokens
    pub fn cancel(ctx: Context<Cancel>, _name: String) -> Result<()> {
        // transfer any SOL from the escrow PDA to the admin
        // TODO: transfer all tokens from the sale token account back to the admin
        let cpi_accounts_transfer = Transfer {
            from: ctx.accounts.sale_token_account.to_account_info(),
            to: ctx.accounts.admin_token_account.to_account_info(),
            authority: ctx.accounts.escrow_pda.to_account_info()
        };
        let transfer_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_transfer);

        token::transfer(transfer_ctx, ctx.accounts.escrow_pda.amount)?;

        // close the escrow account and associated token account
        let cpi_accounts_close = CloseAccount {
            account: ctx.accounts.sale_token_account.to_account_info(),
            destination: ctx.accounts.admin_token_account.to_account_info(),
            authority: ctx.accounts.escrow_pda.to_account_info()
        };
        let close_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_close);
        token::close_account(close_ctx);
        Ok(())
    }

    /// Used by the end user to send SOL to the escrow account and retrieve tokens
    pub fn exchange(ctx: Context<Exchange>, _name: String) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(supply: u64, _rate: u64, name: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        seeds = [b"escrow_pda".as_ref(), name.as_bytes().as_ref()],
        bump,
        space=EscrowAccount::space()
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
    #[account(
        mut, 
        seeds = [b"escrow_pda".as_ref(), name.as_bytes().as_ref()],
        bump,
        close = admin_token_account
    )]
    pub escrow_pda: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub sale_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Exchange<'info> {
    pub user: Signer<'info>,
    #[account(
        mut, 
        seeds = [b"escrow_pda".as_ref(), name.as_bytes().as_ref()],
        bump
    )]
    pub escrow_pda: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub sale_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>
}

#[account]
pub struct EscrowAccount {
    pub amount: u64,  // the amount of tokens on sale
    pub rate: u64,    // the number of tokens that 1 SOL will purchase
    pub name: String, // a name to act as an identifier
    pub bump: u8,
}

impl EscrowAccount {
    pub fn space() -> usize {
        return 8 + 8 + 8 + 132 + 1; // discriminator + amount + rate + name(128 bytes long) + bump
    }
}

#[error_code]
pub enum TokenSaleError {
    #[msg("Unable to get escrow bump")]
    CannotGetEscrowBump,
}
