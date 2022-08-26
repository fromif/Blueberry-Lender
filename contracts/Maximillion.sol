pragma solidity ^0.5.16;

import "./BWrappedNative.sol";

/**
 * @title Compound's Maximillion Contract
 * @author Compound
 */
contract Maximillion {
    /**
     * @notice The BWrappedNative market to repay in
     */
    BWrappedNative public bWrappedNative;

    /**
     * @notice Construct a Maximillion to repay max in a BWrappedNative market
     */
    constructor(BWrappedNative bWrappedNative_) public {
        bWrappedNative = bWrappedNative_;
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in the bWrappedNative market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, bWrappedNative);
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in a bWrappedNative market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param bWrappedNative_ The address of the bWrappedNative contract to repay in
     */
    function repayBehalfExplicit(address borrower, BWrappedNative bWrappedNative_) public payable {
        uint256 received = msg.value;
        uint256 borrows = bWrappedNative_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            bWrappedNative_.repayBorrowBehalfNative.value(borrows)(borrower);
            msg.sender.transfer(received - borrows);
        } else {
            bWrappedNative_.repayBorrowBehalfNative.value(received)(borrower);
        }
    }
}
