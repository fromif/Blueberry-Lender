pragma solidity ^0.5.16;

import "./ERC20.sol";
import "../../contracts/BCollateralCapErc20.sol";
import "../../contracts/ERC3156FlashLenderInterface.sol";
import "../../contracts/BWrappedNative.sol";
import "../../contracts/SafeMath.sol";

// FlashloanReceiver is a simple flashloan receiver implementation for testing
contract FlashloanReceiver is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    uint256 totalBorrows;
    address borrowToken;
    address payable public owner;

    function doFlashloan(
        address bToken,
        uint256 borrowAmount,
        uint256 repayAmount
    ) external {
        borrowToken = BCollateralCapErc20(bToken).underlying();
        uint256 balanceBefore = ERC20(borrowToken).balanceOf(address(this));
        bytes memory data = abi.encode(bToken, borrowAmount, repayAmount);
        totalBorrows = BCollateralCapErc20(bToken).totalBorrows();
        ERC3156FlashLenderInterface(bToken).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        ERC20(borrowToken).approve(msg.sender, amount.add(fee));
        (address bToken, uint256 borrowAmount, uint256 repayAmount) = abi.decode(data, (address, uint256, uint256));
        require(amount == borrowAmount, "Params not match");
        uint256 totalBorrowsAfter = BCollateralCapErc20(bToken).totalBorrows();
        require(totalBorrows.add(borrowAmount) == totalBorrowsAfter, "totalBorrow mismatch");
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanAndMint is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;
    uint256 totalBorrows;
    address borrowToken;

    function doFlashloan(address bToken, uint256 borrowAmount) external {
        borrowToken = BCollateralCapErc20(bToken).underlying();
        bytes memory data = abi.encode(bToken);
        ERC3156FlashLenderInterface(bToken).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        ERC20(borrowToken).approve(msg.sender, amount.add(fee));
        address bToken = abi.decode(data, (address));
        BCollateralCapErc20(bToken).mint(amount.add(fee));
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanAndRepayBorrow is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    address borrowToken;

    function doFlashloan(address bToken, uint256 borrowAmount) external {
        borrowToken = BCollateralCapErc20(bToken).underlying();
        bytes memory data = abi.encode(bToken);
        ERC3156FlashLenderInterface(bToken).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        ERC20(borrowToken).approve(msg.sender, amount.add(fee));
        address bToken = abi.decode(data, (address));
        BCollateralCapErc20(bToken).repayBorrow(amount.add(fee));
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanTwice is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;
    address borrowToken;

    function doFlashloan(address bToken, uint256 borrowAmount) external {
        borrowToken = BCollateralCapErc20(bToken).underlying();

        bytes memory data = abi.encode(bToken);
        ERC3156FlashLenderInterface(bToken).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        ERC20(borrowToken).approve(msg.sender, amount.add(fee));
        address bToken = abi.decode(data, (address));
        BCollateralCapErc20(bToken).flashLoan(this, address(this), amount, data);
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanReceiverNative is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    uint256 totalBorrows;

    function doFlashloan(
        address payable bToken,
        uint256 borrowAmount,
        uint256 repayAmount
    ) external {
        ERC20 underlying = ERC20(BWrappedNative(bToken).underlying());
        uint256 balanceBefore = underlying.balanceOf(address(this));
        bytes memory data = abi.encode(bToken, borrowAmount);
        totalBorrows = BWrappedNative(bToken).totalBorrows();
        underlying.approve(bToken, repayAmount);
        ERC3156FlashLenderInterface(bToken).flashLoan(this, address(underlying), borrowAmount, data);
        uint256 balanceAfter = underlying.balanceOf(address(this));
        require(balanceAfter == balanceBefore.add(borrowAmount).sub(repayAmount), "Balance inconsistent");
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        (address payable bToken, uint256 borrowAmount) = abi.decode(data, (address, uint256));
        require(token == BWrappedNative(bToken).underlying(), "Params not match");
        require(amount == borrowAmount, "Params not match");
        uint256 totalBorrowsAfter = BWrappedNative(bToken).totalBorrows();
        require(totalBorrows.add(borrowAmount) == totalBorrowsAfter, "totalBorrow mismatch");
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }

    function() external payable {}
}

contract FlashloanAndMintNative is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    function doFlashloan(address payable bToken, uint256 borrowAmount) external {
        bytes memory data = abi.encode(bToken);
        ERC3156FlashLenderInterface(bToken).flashLoan(this, BWrappedNative(bToken).underlying(), borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        address payable bToken = abi.decode(data, (address));
        BWrappedNative(bToken).mint(amount.add(fee));
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanAndRepayBorrowNative is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    function doFlashloan(address payable bToken, uint256 borrowAmount) external {
        bytes memory data = abi.encode(bToken);
        ERC3156FlashLenderInterface(bToken).flashLoan(this, BWrappedNative(bToken).underlying(), borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        address payable bToken = abi.decode(data, (address));
        BWrappedNative(bToken).repayBorrow(amount.add(fee));
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanTwiceNative is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    function doFlashloan(address payable bToken, uint256 borrowAmount) external {
        address borrowToken = BWrappedNative(bToken).underlying();
        bytes memory data = abi.encode(bToken);
        ERC3156FlashLenderInterface(bToken).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        address payable bToken = abi.decode(data, (address));
        ERC3156FlashLenderInterface(bToken).flashLoan(this, token, amount, data);
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}
