pragma solidity ^0.5.16;

import "../../contracts/LiquidityMiningInterface.sol";

contract MockLiquidityMining is LiquidityMiningInterface {
    address public comptroller;

    constructor(address _comptroller) public {
        comptroller = _comptroller;
    }

    function updateSupplyIndex(address bToken, address[] calldata accounts) external {
        // Do nothing.
        bToken;
        accounts;
    }

    function updateBorrowIndex(address bToken, address[] calldata accounts) external {
        // Do nothing.
        bToken;
        accounts;
    }
}
