use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;

declare_id!("5GQn3NDZgciJmNB85Az5V5FrAY64QddUWW9kKsRDLn2a");

const PREFIX_STATE: &str= "state_4";
const PREFIX_CONFIG: &str = "config_4";
const PREFIX_BALANCE: &str = "balance_4";
const PREFIX_ORDER: &str = "order_4";
const PREFIX_RECEIPT: &str = "receipt_4";
const ADMIN: &str = "BuTuA7YKzx5CUn3bALZcK97jQrFM94QfsBUaUdM6BCxm";

#[program]
pub mod solana_lending {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global = &mut ctx.accounts.global_state;
        global.curr_order_sn = 1;
        global.curr_receipt_sn = 1;
        Ok(())
    }

    pub fn set_config(
        ctx: Context<SetConfig>,
        min_ir: u16,
        max_ir: u16,
        penalty_ir: u8,
        penalty_days: u8,
        commission_rate: u8,
        cycle: u64,
        deadline: u64
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.min_ir = min_ir;
        config.max_ir = max_ir;
        config.penalty_ir = penalty_ir;
        config.penalty_days = penalty_days;
        config.commission_rate = commission_rate;
        config.cycle = cycle;
        config.deadline = deadline;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        invoke(
            &system_instruction::transfer(ctx.accounts.payer.key, ctx.accounts.user_balance.to_account_info().key, amount),
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.user_balance.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        Ok(())
    } 

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(**ctx.accounts.user_balance.to_account_info().try_borrow_lamports()? >= amount, MyError::InsufficientBalanceForWithdraw);
        **ctx.accounts.user_balance.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.payer.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }

    pub fn place_order(ctx: Context<PlaceOrder>, amount: u64, rate: u16) -> Result<()> {
        let order = &mut ctx.accounts.order;
        let global = &mut ctx.accounts.global;
        let config = &ctx.accounts.config;
        
        require!(**ctx.accounts.user_balance.to_account_info().try_borrow_lamports()? >= amount, MyError::InsufficientBalanceForPlaceOrder);
        require!(rate >= config.min_ir && rate <= config.max_ir, MyError::IllegalInterestRate);
        **ctx.accounts.user_balance.to_account_info().try_borrow_mut_lamports()? -= amount;
        **order.to_account_info().try_borrow_mut_lamports()? += amount;
        order.sn = global.curr_order_sn;
        order.lender = ctx.accounts.payer.key();
        order.balance = amount;
        order.rate = rate;
        global.curr_order_sn += 1;

        emit!(EventPlaceOrder {
            order_sn: order.sn,
            lender: ctx.accounts.payer.key(),
            balance: amount,
            rate: rate,
        });
        Ok(())
    }

    pub fn cancel_order(ctx: Context<CancelOrder>, order_sn: u64) -> Result<()> {
        let order = &mut ctx.accounts.order;
        require!(order_sn == order.sn && order.lender == ctx.accounts.payer.key(), MyError::NoOrderFoundForCancelOrder);
        **order.to_account_info().try_borrow_mut_lamports()? -= order.balance;
        **ctx.accounts.user_balance.to_account_info().try_borrow_mut_lamports()? += order.balance;

        emit!(EventCancelOrder {
            order_sn: order.sn,
            lender: ctx.accounts.payer.key(),
            balance: order.balance,
        });
        Ok(())
    }

    //#[access_control(only_admin(&ctx.accounts.payer))]
    //pub fn borrow(ctx: Context<Borrow>, order_sn: u64, borrower: Pubkey, chainid: u32, c_sn: u64, source: [u8; 20], token: [u8; 20], frozen: u64, amount: u64) -> Result<()> {
    pub fn borrow(ctx: Context<Borrow>, order_sn: u64, amount: u64) -> Result<()> {
        let receipt = &mut ctx.accounts.receipt;
        let order = &mut ctx.accounts.order;
        let global = &mut ctx.accounts.global;
        require!(order.balance >= amount, MyError::InsufficientOrderBalanceForBorrow);
        require!(order.sn == order_sn, MyError::InvalidOrderSNForBorrow);

        receipt.sn = global.curr_receipt_sn;
        receipt.borrower = ctx.accounts.payer.key();
        receipt.lender = order.lender;
        /*receipt.source = source;
        receipt.chainid = chainid;
        receipt.c_sn = c_sn;
        receipt.token = token;
        receipt.frozen = frozen;*/
        receipt.amount = amount;
        receipt.time = ctx.accounts.clock.unix_timestamp as u64;
        receipt.rate = order.rate;
        global.curr_receipt_sn += 1;
        order.balance -= amount;

        **ctx.accounts.order.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.recipient.try_borrow_mut_lamports()? += amount;

        /*emit!(EventBorrowSuccess {
            receipt_sn: receipt.sn,
            borrower: borrower,
            lender: receipt.lender,
            source: source,
            chainid: chainid,
            c_sn: c_sn,
            token: token,
            frozen: frozen,
            amount: amount,
            time: receipt.time,
            rate: receipt.rate,
            order_sn: order_sn,
            //order_balance: order.balance,
        });*/
        Ok(())
    }

    pub fn repay(ctx: Context<Repay>, receipt_sn: u64) -> Result<()> {
        let receipt = &mut ctx.accounts.receipt;
        require!(receipt.borrower == *ctx.accounts.payer.key, MyError::NoReceiptFoundForRepay);
        require!(receipt.sn == receipt_sn, MyError::NoReceiptFoundForRepay);
        let amount = receipt.amount + (receipt.amount * receipt.rate as u64) / 10000;
        invoke(
            &system_instruction::transfer(ctx.accounts.payer.key, ctx.accounts.lender_balance.to_account_info().key, amount),
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.lender_balance.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        //**ctx.accounts.payer.to_account_info().try_borrow_mut_lamports()? -= amount;
        //**ctx.accounts.lender_balance.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(init_if_needed, payer = payer, space = 8, seeds = [PREFIX_BALANCE.as_bytes(), payer.key().as_ref()], bump)]
    pub user_balance: Account<'info, UserBalance>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [PREFIX_BALANCE.as_bytes(), payer.key().as_ref()], bump)]
    pub user_balance: Account<'info, UserBalance>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceOrder<'info> {
    #[account(init, payer = payer, space = 8 + 50, seeds = [PREFIX_ORDER.as_bytes(), global.curr_order_sn.to_le_bytes().as_ref()], bump)]
    pub order: Account<'info, Order>,
    #[account(mut, seeds = [PREFIX_BALANCE.as_bytes(), payer.key().as_ref()], bump)]
    pub user_balance: Account<'info, UserBalance>,
    #[account(mut, seeds = [PREFIX_STATE.as_bytes()], bump)]
    pub global: Account<'info, GlobalState>,
    #[account(seeds = [PREFIX_CONFIG.as_bytes()], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_sn: u64)]
pub struct CancelOrder<'info> {
    #[account(mut, close = payer, seeds = [PREFIX_ORDER.as_bytes(), order_sn.to_le_bytes().as_ref()], bump)]
    pub order: Account<'info, Order>,
    #[account(mut, seeds = [PREFIX_BALANCE.as_bytes(), payer.key().as_ref()], bump)]
    pub user_balance: Account<'info, UserBalance>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_sn: u64)]
pub struct Borrow<'info> {
    #[account(init, payer = payer, space = 8 + 90, seeds = [PREFIX_RECEIPT.as_bytes(), global.curr_receipt_sn.to_le_bytes().as_ref()], bump)]
    pub receipt: Account<'info, LoanReceipt>,
    #[account(mut, seeds = [PREFIX_ORDER.as_bytes(), order_sn.to_le_bytes().as_ref()], bump)]
    pub order: Account<'info, Order>,
    #[account(mut, seeds = [PREFIX_STATE.as_bytes()], bump)]
    pub global: Account<'info, GlobalState>,
    //#[account(mut, constraint = recipient.key == &borrower)]
    #[account(mut)]
    /// CHECK: 
    pub recipient: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(receipt_sn: u64)]
pub struct Repay<'info> {
    #[account(mut, close = payer, seeds = [PREFIX_RECEIPT.as_bytes(), receipt_sn.to_le_bytes().as_ref()], bump)]
    pub receipt: Account<'info, LoanReceipt>,
    #[account(mut)]
    pub lender_balance: Account<'info, UserBalance>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + 64, seeds = [PREFIX_STATE.as_bytes()], bump)]
    global_state: Account<'info, GlobalState>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetConfig<'info> {
    #[account(init_if_needed, payer = payer, space = 8 + 64, seeds = [PREFIX_CONFIG.as_bytes()], bump)]
    config: Account<'info, Config>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct LoanReceipt {
    pub sn: u64,
    pub borrower: Pubkey,
    pub lender: Pubkey,
    //pub source: [u8; 20], //space=150
    //pub chainid: u32,
    //pub c_sn: u64,
    //pub token: [u8; 20],
    //pub frozen: u64,
    pub amount: u64,
    pub time: u64,
    pub rate: u16,
}

#[account]
#[derive(Default)]
pub struct Order {
    pub sn: u64,
    pub lender: Pubkey,
    pub balance: u64,
    pub rate: u16,
}

#[account]
#[derive(Default)]
pub struct UserBalance {}

#[account]
#[derive(Default)]
pub struct GlobalState {
    pub curr_order_sn: u64,
    pub curr_receipt_sn: u64,
}

#[account]
#[derive(Default)]
pub struct Config {
    pub min_ir: u16,
    pub max_ir: u16,
    pub penalty_ir: u8,
    pub penalty_days: u8,
    pub commission_rate: u8,
    pub cycle: u64,
    pub deadline: u64,
}

#[event]
pub struct EventPlaceOrder {
    pub order_sn: u64,
    pub lender: Pubkey,
    pub balance: u64,
    pub rate: u16,
}

#[event]
pub struct EventCancelOrder {
    pub order_sn: u64,
    pub lender: Pubkey,
    pub balance: u64,
}

#[event]
pub struct EventBorrowSuccess {
    pub receipt_sn: u64,
    pub borrower: Pubkey,
    pub lender: Pubkey,
    pub source: [u8; 20],
    pub chainid: u32,
    pub c_sn: u64,
    pub token: [u8; 20],
    pub frozen: u64,
    pub amount: u64,
    pub time: u64,
    pub rate: u16,
    pub order_sn: u64,
    //pub order_balance: u64,
}

pub fn only_admin<'info>(payer: &Signer<'info>) -> Result<()> {
    if payer.key.to_string() != ADMIN {
        return Err(MyError::NoOperationPermission.into());
    }
    Ok(())
}

#[error_code]
pub enum MyError {
    #[msg("Insufficient Balance for Place Order")]
    InsufficientBalanceForPlaceOrder,
    #[msg("Insufficient Balance for Withdraw")]
    InsufficientBalanceForWithdraw,
    #[msg("Illegal Interest Rate")]
    IllegalInterestRate,
    #[msg("No Order Found for Cancel Order")]
    NoOrderFoundForCancelOrder,
    #[msg("Invalid Order for Borrow")]
    InvalidOrderSNForBorrow,
    #[msg("Insufficient Order Balance for Borrow")]
    InsufficientOrderBalanceForBorrow,
    #[msg("No Operation Permission")]
    NoOperationPermission,
    #[msg("No Receipt Found for Repay")]
    NoReceiptFoundForRepay,
  }