pragma solidity ^0.5.16;

import "../../contracts/Comptroller.sol";

contract ComptrollerScenario is Comptroller {
    uint256 public blockNumber;

    constructor() public Comptroller() {}

    function fastForward(uint256 blocks) public returns (uint256) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint256 number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint256) {
        return blockNumber;
    }

    function membershipLength(BToken bToken) public view returns (uint256) {
        return accountAssets[address(bToken)].length;
    }

    function unlist(BToken bToken) public {
        markets[address(bToken)].isListed = false;
    }
}
