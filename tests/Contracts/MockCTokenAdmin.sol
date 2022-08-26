pragma solidity ^0.5.16;

import "../../contracts/BTokenAdmin.sol";

contract MockCTokenAdmin is BTokenAdmin {
    uint256 public blockTimestamp;

    constructor(address payable _admin) public BTokenAdmin(_admin) {}

    function setBlockTimestamp(uint256 timestamp) public {
        blockTimestamp = timestamp;
    }

    function getBlockTimestamp() public view returns (uint256) {
        return blockTimestamp;
    }
}
