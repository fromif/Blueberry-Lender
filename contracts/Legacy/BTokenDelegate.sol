pragma solidity ^0.5.16;

import "./BCapableErc20Delegate.sol";
import "../EIP20Interface.sol";

/**
 * @notice Compound's Comptroller interface to get Comp address
 */
interface IComptroller {
    function getCompAddress() external view returns (address);

    function claimComp(
        address[] calldata holders,
        BToken[] calldata bTokens,
        bool borrowers,
        bool suppliers
    ) external;
}

/**
 * @title Cream's BToken's Contract
 * @notice BToken which wraps Compound's BToken
 * @author Cream
 */
contract BTokenDelegate is BCapableErc20Delegate {
    /**
     * @notice The comptroller of Compound's BToken
     */
    address public underlyingComptroller;

    /**
     * @notice Comp token address
     */
    address public comp;

    /**
     * @notice Container for comp rewards state
     * @member balance The balance of comp
     * @member index The last updated index
     */
    struct RewardState {
        uint256 balance;
        uint256 index;
    }

    /**
     * @notice The state of Compound's BToken supply
     */
    RewardState public supplyState;

    /**
     * @notice The index of every Compound's BToken supplier
     */
    mapping(address => uint256) public supplierState;

    /**
     * @notice The comp amount of every user
     */
    mapping(address => uint256) public compUserAccrued;

    /**
     * @notice Delegate interface to become the implementation
     * @param data The encoded arguments for becoming
     */
    function _becomeImplementation(bytes memory data) public {
        super._becomeImplementation(data);

        underlyingComptroller = address(BToken(underlying).comptroller());
        comp = IComptroller(underlyingComptroller).getCompAddress();
    }

    /**
     * @notice Manually claim comp rewards by user
     * @return The amount of comp rewards user claims
     */
    function claimComp(address account) public returns (uint256) {
        harvestComp();

        updateSupplyIndex();
        updateSupplierIndex(account);

        uint256 compBalance = compUserAccrued[account];
        if (compBalance > 0) {
            // Transfer user comp and subtract the balance in supplyState
            EIP20Interface(comp).transfer(account, compBalance);
            supplyState.balance = sub_(supplyState.balance, compBalance);

            // Clear user's comp accrued.
            compUserAccrued[account] = 0;

            return compBalance;
        }
        return 0;
    }

    /*** BToken Overrides ***/

    /**
     * @notice Transfer `tokens` tokens from `src` to `dst` by `spender`
     * @param spender The address of the account performing the transfer
     * @param src The address of the source account
     * @param dst The address of the destination account
     * @param tokens The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transferTokens(
        address spender,
        address src,
        address dst,
        uint256 tokens
    ) internal returns (uint256) {
        harvestComp();

        updateSupplyIndex();
        updateSupplierIndex(src);
        updateSupplierIndex(dst);

        return super.transferTokens(spender, src, dst, tokens);
    }

    /*** Safe Token ***/

    /**
     * @notice Transfer the underlying to this contract
     * @param from Address to transfer funds from
     * @param amount Amount of underlying to transfer
     * @param isNative The amount is in native or not
     * @return The actual amount that is transferred
     */
    function doTransferIn(
        address from,
        uint256 amount,
        bool isNative
    ) internal returns (uint256) {
        uint256 transferredIn = super.doTransferIn(from, amount, isNative);

        harvestComp();
        updateSupplyIndex();
        updateSupplierIndex(from);

        return transferredIn;
    }

    /**
     * @notice Transfer the underlying from this contract
     * @param to Address to transfer funds to
     * @param amount Amount of underlying to transfer
     * @param isNative The amount is in native or not
     */
    function doTransferOut(
        address payable to,
        uint256 amount,
        bool isNative
    ) internal {
        harvestComp();
        updateSupplyIndex();
        updateSupplierIndex(to);

        super.doTransferOut(to, amount, isNative);
    }

    /*** Internal functions ***/

    function harvestComp() internal {
        address[] memory holders = new address[](1);
        holders[0] = address(this);
        BToken[] memory bTokens = new BToken[](1);
        bTokens[0] = BToken(underlying);

        // CBToken contract will never borrow assets from Compound.
        IComptroller(underlyingComptroller).claimComp(holders, bTokens, false, true);
    }

    function updateSupplyIndex() internal {
        uint256 compAccrued = sub_(compBalance(), supplyState.balance);
        uint256 supplyTokens = BToken(address(this)).totalSupply();
        Double memory ratio = supplyTokens > 0 ? fraction(compAccrued, supplyTokens) : Double({mantissa: 0});
        Double memory index = add_(Double({mantissa: supplyState.index}), ratio);

        // Update supplyState.
        supplyState.index = index.mantissa;
        supplyState.balance = compBalance();
    }

    function updateSupplierIndex(address supplier) internal {
        Double memory supplyIndex = Double({mantissa: supplyState.index});
        Double memory supplierIndex = Double({mantissa: supplierState[supplier]});
        Double memory deltaIndex = sub_(supplyIndex, supplierIndex);
        if (deltaIndex.mantissa > 0) {
            uint256 supplierTokens = BToken(address(this)).balanceOf(supplier);
            uint256 supplierDelta = mul_(supplierTokens, deltaIndex);
            compUserAccrued[supplier] = add_(compUserAccrued[supplier], supplierDelta);
            supplierState[supplier] = supplyIndex.mantissa;
        }
    }

    function compBalance() internal view returns (uint256) {
        return EIP20Interface(comp).balanceOf(address(this));
    }
}
