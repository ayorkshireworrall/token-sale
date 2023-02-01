use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, Token, Transfer, SetAuthority, spl_token::instruction::AuthorityType, spl_token::instruction::transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_sale {
    use anchor_lang::solana_program::program::invoke;

    use super::*;

    /// Used by the admin user to create an escrow account holding tokens
    pub fn initialize(ctx: Context<Initialize>, name: String, rate: u64, supply: u64) -> Result<()> {
        // TODO check that user's account has at least as many tokens as in the supply
        
        let escrow = &mut ctx.accounts.escrow;
        let bump = *ctx.bumps.get("escrow").ok_or(TokenSaleError::CannotGetEscrowBump)?;

        escrow.admin = *ctx.accounts.user.key;
        escrow.name = name;
        escrow.escrow_token_account = *ctx.accounts.escrow_token_account.to_account_info().key;
        escrow.total_token_availability = supply;
        escrow.exchange_rate = rate;
        escrow.bump = bump;

        let ix = transfer(
            &ctx.accounts.token_program.key, 
            &ctx.accounts.admin_depositing_token_account.to_account_info().key, 
            &ctx.accounts.escrow_token_account.to_account_info().key, 
            &ctx.accounts.admin_depositing_token_account.to_account_info().key, 
            &[], 
            supply
        )?;
        let transfer_result = invoke(
            &ix, 
            &[ctx.accounts.admin_depositing_token_account.to_account_info(), ctx.accounts.escrow_token_account.to_account_info(), ctx.accounts.admin_depositing_token_account.to_account_info()]
        );

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
#[instruction(name: String, supply: u64)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer=user, 
        space=9000, 
        seeds=[b"escrow"],
        bump
    )]
    escrow: Account<'info, EscrowAccount>,
    mint: Account<'info, Mint>,
    #[account(
        init,
        seeds = [b"escrow_token_account".as_ref()],
        bump,
        payer = user,
        token::mint = mint,
        token::authority = escrow,
    )]
    escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = admin_depositing_token_account.amount >= supply
    )]
    admin_depositing_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    user: Signer<'info>,
    system_program: Program<'info, System>, 
    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Cancel<'info> {
    #[account(
        mut,
        seeds=[b"escrow"],
        bump
    )]
    escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Exchange<'info> {
    #[account(
        mut,
        seeds=[b"escrow"],
        bump
    )]
    escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    system_program: Program<'info, System>, 
}

#[account]
pub struct EscrowAccount {
    pub admin: Pubkey, // the user that created the token sale
    pub escrow_token_account: Pubkey, // the address created to hold the tokens for sale
    pub name: String,
    pub exchange_rate: u64, // the number of tokens that can be bought for 1 SOL
    pub total_token_availability: u64,
    pub bump: u8,
}

#[error_code]
pub enum TokenSaleError {
    #[msg("Unable to get escrow bump")]
    CannotGetEscrowBump,
}
