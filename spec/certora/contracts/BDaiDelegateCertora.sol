pragma solidity ^0.5.16;

import "../../../contracts/BDaiDelegate.sol";

contract BDaiDelegateCertora is BDaiDelegate {
    function getCashOf(address account) public view returns (uint256) {
        return EIP20Interface(underlying).balanceOf(account);
    }
}
