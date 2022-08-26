pragma solidity ^0.5.16;

import "../../contracts/PriceOracle/PriceOracle.sol";

contract FixedPriceOracle is PriceOracle {
    uint256 public price;

    constructor(uint256 _price) public {
        price = _price;
    }

    function getUnderlyingPrice(BToken bToken) public view returns (uint256) {
        bToken;
        return price;
    }

    function assetPrices(address asset) public view returns (uint256) {
        asset;
        return price;
    }
}
