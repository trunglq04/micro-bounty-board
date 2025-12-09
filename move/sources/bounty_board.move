module bounty_board::lucky_bounty;

use iota::balance::Balance;
use iota::coin::{Self, Coin};
use iota::iota::IOTA;
use std::string::String;

// Errors Codes
const ETaskNotOpen: u64 = 0;
const ETaskNotClaimed: u64 = 1;
const ENotAssignee: u64 = 2;
const ENotCreator: u64 = 3;
const ETaskNotCompleted: u64 = 4;

// Status codes
const STATUS_OPEN: u8 = 0;
const STATUS_CLAIMED: u8 = 1;
const STATUS_COMPLETED: u8 = 2;

public struct Task has key, store {
    id: UID,
    creator: address,
    assignee: Option<address>,
    description: String,
    status: u8, // 0: Open, 1: Claimed, 2: Done
    reward: Balance<IOTA>,
}

/// Create new task with reward  
public fun post_task(description: String, payment: Coin<IOTA>, ctx: &mut TxContext) {
    let task = Task {
        id: object::new(ctx),
        creator: tx_context::sender(ctx),
        assignee: option::none(),
        description: description,
        status: STATUS_OPEN,
        reward: coin::into_balance(payment),
    };

    // Share the object so others can find and claim it
    transfer::share_object(task);
}

/// Someone claims the task
/// Status moves from OPEN -> CLAIMED
public fun claim_task(task: &mut Task, ctx: &mut TxContext) {
    assert!(task.status == STATUS_OPEN, ETaskNotOpen);

    task.status = STATUS_CLAIMED;
    task.assignee = option::some(tx_context::sender(ctx));
}

/// The assignee marks the task as completed
/// Status moves from CLAIMED -> COMPLETED
public fun complete_task(task: &mut Task, ctx: &mut TxContext) {
    assert!(task.status == STATUS_CLAIMED, ETaskNotClaimed);

    // Ensure only the assigned person can complete it
    let sender = tx_context::sender(ctx);
    assert!(task.assignee == option::some(sender), ENotAssignee);

    task.status = STATUS_COMPLETED;
}

/// The Creator approves the work and pays out the reward
/// This deletes the Task object and sends funds to the Assignee
public fun approve_and_pay(task: Task, ctx: &mut TxContext) {
    let Task {
        id,
        creator,
        mut assignee,
        description: _,
        status,
        reward,
    } = task;

    // Security checks
    assert!(tx_context::sender(ctx) == creator, ENotCreator);
    assert!(status == STATUS_COMPLETED, ETaskNotCompleted);
    assert!(option::is_some(&assignee), ETaskNotClaimed);

    let worker_addr = option::extract<address>(&mut assignee);

    // Create a coin from the stored balance
    let coin_reward = coin::from_balance(reward, ctx);

    // Transfer funds to worker
    transfer::public_transfer(coin_reward, worker_addr);

    // Delete the task
    object::delete(id);
}


// / The Creator cancels the task while it's still OPEN
public fun cancel_task(task: Task, ctx: &mut TxContext) {
    let Task {
        id,
        creator,
        assignee: _,
        description: _,
        status,
        reward,
    } = task;

    assert!(tx_context::sender(ctx) == creator, ENotCreator);
    assert!(status == STATUS_OPEN, ETaskNotOpen);

    // Refund creator
    let refund = coin::from_balance(reward, ctx);
    transfer::public_transfer(refund, creator);

    // Delete the task
    object::delete(id);
}
