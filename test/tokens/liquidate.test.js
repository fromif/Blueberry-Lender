const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  setBalance,
  pretendBorrow,
  preApprove,
  fastForward,
  makeBToken,
  getBalances,
  adjustBalances,
} = require("../utils/compound");
const {
  etherUnsigned,
  etherGasCost,
  UInt256Max,
} = require("../utils/ethereum");

const repayAmount = etherUnsigned(10e2);
const seizeAmount = repayAmount;
const seizeTokens = seizeAmount.mul(4); // forced

async function preLiquidate(
  bToken,
  liquidator,
  borrower,
  repayAmount,
  bTokenCollateral
) {
  // setup for success in liquidating
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    comptrollerAddr
  );
  await comptroller.setLiquidateBorrowAllowed(true);
  await comptroller.setLiquidateBorrowVerify(true);
  await comptroller.setRepayBorrowAllowed(true);
  await comptroller.setRepayBorrowVerify(true);
  await comptroller.setSeizeAllowed(true);
  await comptroller.setSeizeVerify(true);
  await comptroller.setFailCalculateSeizeTokens(false);

  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.ERC20_HARNESS,
    underlyingAddr
  );
  await underlying.harnessSetFailTransferFromAddress(liquidator.address, false);

  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);

  const bTokenCollateralInterestRateModelAddr =
    await bTokenCollateral.interestRateModel();
  const bTokenCollateralInterestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    bTokenCollateralInterestRateModelAddr
  );
  await bTokenCollateralInterestRateModel.setFailBorrowRate(false);

  const bTokenCollateralComptrollerAddr = await bTokenCollateral.comptroller();
  const bTokenCollateralComptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    bTokenCollateralComptrollerAddr
  );
  await bTokenCollateralComptroller.setCalculatedSeizeTokens(seizeTokens);

  await setBalance(bTokenCollateral, liquidator.address, 0);
  await setBalance(bTokenCollateral, borrower.address, seizeTokens);
  await pretendBorrow(bTokenCollateral, borrower.address, 0, 1, 0);
  await pretendBorrow(bToken, borrower.address, 1, 1, repayAmount);
  await preApprove(bToken, liquidator, repayAmount);
}

async function liquidateFresh(
  bToken,
  liquidator,
  borrower,
  repayAmount,
  bTokenCollateral
) {
  return bToken.harnessLiquidateBorrowFresh(
    liquidator.address,
    borrower.address,
    repayAmount,
    bTokenCollateral.address
  );
}

async function liquidate(
  bToken,
  liquidator,
  borrower,
  repayAmount,
  bTokenCollateral
) {
  // make sure to have a block delta so we accrue interest
  await fastForward(bToken, 1);
  await fastForward(bTokenCollateral, 1);
  return bToken
    .connect(liquidator)
    .liquidateBorrow(borrower.address, repayAmount, bTokenCollateral.address);
}

async function seize(bToken, liquidator, borrower, seizeAmount) {
  return bToken.seize(liquidator.address, borrower.address, seizeAmount);
}

describe("BToken", function () {
  let root, liquidator, borrower, accounts;
  let bToken, bTokenCollateral, comptroller;

  beforeEach(async () => {
    [root, liquidator, borrower, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({ comptrollerOpts: { kind: "bool" } });
    const comptrollerAddr = await bToken.comptroller();
    comptroller = await ethers.getContractAt(
      CONTRACT_NAMES.BOOL_COMPTROLLER,
      comptrollerAddr
    );
    bTokenCollateral = await makeBToken({ comptroller: comptroller });
  });

  beforeEach(async () => {
    await preLiquidate(
      bToken,
      liquidator,
      borrower,
      repayAmount,
      bTokenCollateral
    );
  });

  describe("liquidateBorrowFresh", () => {
    it("fails if comptroller tells it to", async () => {
      await comptroller.setLiquidateBorrowAllowed(false);
      await expect(
        liquidateFresh(
          bToken,
          liquidator,
          borrower,
          repayAmount,
          bTokenCollateral
        )
      ).to.be.revertedWith("rejected");
    });

    it("proceeds if comptroller tells it to", async () => {
      await liquidateFresh(
        bToken,
        liquidator,
        borrower,
        repayAmount,
        bTokenCollateral
      );
    });

    it("fails if market is stale", async () => {
      await fastForward(bToken);
      await expect(
        liquidateFresh(
          bToken,
          liquidator,
          borrower,
          repayAmount,
          bTokenCollateral
        )
      ).to.be.revertedWith("market is stale");
    });

    it("fails if collateral market is stale", async () => {
      await fastForward(bToken);
      await fastForward(bTokenCollateral);
      await bToken.accrueInterest();
      await expect(
        liquidateFresh(
          bToken,
          liquidator,
          borrower,
          repayAmount,
          bTokenCollateral
        )
      ).to.be.revertedWith("market is stale");
    });

    it("fails if borrower is equal to liquidator", async () => {
      await expect(
        liquidateFresh(
          bToken,
          borrower,
          borrower,
          repayAmount,
          bTokenCollateral
        )
      ).to.be.revertedWith("invalid account pair");
    });

    it("fails if repayAmount = 0", async () => {
      await expect(
        liquidateFresh(bToken, liquidator, borrower, 0, bTokenCollateral)
      ).to.be.revertedWith("invalid amount");
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances(
        [bToken, bTokenCollateral],
        [liquidator.address, borrower.address]
      );
      await comptroller.setFailCalculateSeizeTokens(true);
      await expect(
        liquidateFresh(
          bToken,
          liquidator,
          borrower,
          repayAmount,
          bTokenCollateral
        )
      ).to.be.revertedWith("calculate seize amount failed");
      const afterBalances = await getBalances(
        [bToken, bTokenCollateral],
        [liquidator.address, borrower.address]
      );
      expect(afterBalances.toString()).to.be.equal(beforeBalances.toString());
    });

    it("fails if repay fails", async () => {
      await comptroller.setRepayBorrowAllowed(false);
      await expect(
        liquidateFresh(
          bToken,
          liquidator,
          borrower,
          repayAmount,
          bTokenCollateral
        )
      ).to.be.revertedWith("rejected");
    });

    it("reverts if seize fails", async () => {
      await comptroller.setSeizeAllowed(false);
      await expect(
        liquidateFresh(
          bToken,
          liquidator,
          borrower,
          repayAmount,
          bTokenCollateral
        )
      ).to.be.revertedWith("rejected");
    });

    it("reverts if liquidateBorrowVerify fails", async () => {
      await comptroller.setLiquidateBorrowVerify(false);
      await expect(
        liquidateFresh(
          bToken,
          liquidator,
          borrower,
          repayAmount,
          bTokenCollateral
        )
      ).to.be.revertedWith("liquidateBorrowVerify rejected liquidateBorrow");
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances(
        [bToken, bTokenCollateral],
        [liquidator.address, borrower.address]
      );
      const result = await liquidateFresh(
        bToken,
        liquidator,
        borrower,
        repayAmount,
        bTokenCollateral
      );
      const afterBalances = await getBalances(
        [bToken, bTokenCollateral],
        [liquidator.address, borrower.address]
      );
      const expectedBalances = await adjustBalances(beforeBalances, [
        [bToken, "cash", repayAmount],
        [bToken, "borrows", -repayAmount],
        [bToken, liquidator.address, "cash", -repayAmount],
        [bTokenCollateral, liquidator.address, "tokens", seizeTokens],
        [bToken, borrower.address, "borrows", -repayAmount],
        [bTokenCollateral, borrower.address, "tokens", -seizeTokens],
      ]);

      const receipt = await result.wait();
      expect(receipt.events[3].event).to.be.equal("LiquidateBorrow");
      expect(receipt.events[3].args[0]).to.be.equal(liquidator.address);
      expect(receipt.events[3].args[1]).to.be.equal(borrower.address);
      expect(receipt.events[3].args[2]).to.be.equal(repayAmount.toString());
      expect(receipt.events[3].args[3]).to.be.equal(bTokenCollateral.address);
      expect(receipt.events[3].args[4]).to.be.equal(seizeTokens.toString());

      expect(receipt.events[0].event).to.be.equal("Transfer");
      expect(receipt.events[0].args[0]).to.be.equal(liquidator.address);
      expect(receipt.events[0].args[1]).to.be.equal(bToken.address);
      expect(receipt.events[0].args[2]).to.be.equal(repayAmount.toString());

      expect(receipt.events[2].event).to.be.equal("Transfer");
      expect(receipt.events[2].args[0]).to.be.equal(borrower.address);
      expect(receipt.events[2].args[1]).to.be.equal(liquidator.address);
      expect(receipt.events[2].args[2]).to.be.equal(seizeTokens.toString());
      expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
    });
  });

  describe("liquidateBorrow", () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      const interestRateModelAddr = await bToken.interestRateModel();
      const interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(true);
      await expect(
        liquidate(bToken, liquidator, borrower, repayAmount, bTokenCollateral)
      ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      const bTokenCollateralInterestRateModelAddr =
        await bTokenCollateral.interestRateModel();
      const bTokenInterestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        bTokenCollateralInterestRateModelAddr
      );
      await bTokenInterestRateModel.setFailBorrowRate(true);
      await expect(
        liquidate(bToken, liquidator, borrower, repayAmount, bTokenCollateral)
      ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      await expect(
        liquidate(bToken, liquidator, borrower, 0, bTokenCollateral)
      ).to.be.revertedWith("invalid amount");
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances(
        [bToken, bTokenCollateral],
        [liquidator.address, borrower.address]
      );
      const result = await liquidate(
        bToken,
        liquidator,
        borrower,
        repayAmount,
        bTokenCollateral
      );
      const gasCost = await etherGasCost(result);
      const afterBalances = await getBalances(
        [bToken, bTokenCollateral],
        [liquidator.address, borrower.address]
      );
      const expectedBalances = await adjustBalances(beforeBalances, [
        [bToken, "cash", repayAmount],
        [bToken, "borrows", -repayAmount],
        [bToken, liquidator.address, "eth", gasCost],
        [bToken, liquidator.address, "cash", -repayAmount],
        [bTokenCollateral, liquidator.address, "eth", gasCost],
        [bTokenCollateral, liquidator.address, "tokens", seizeTokens],
        [bToken, borrower.address, "borrows", -repayAmount],
        [bTokenCollateral, borrower.address, "tokens", -seizeTokens],
      ]);
      expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
    });
  });

  describe("seize", () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await comptroller.setSeizeAllowed(false);
      await expect(
        seize(bTokenCollateral, liquidator, borrower, seizeTokens)
      ).to.be.revertedWith("rejected");
    });

    it("fails if bTokenBalances[borrower] < amount", async () => {
      await setBalance(bTokenCollateral, borrower.address, 1);
      await expect(
        seize(bTokenCollateral, liquidator, borrower, seizeTokens)
      ).to.be.revertedWith("subtraction underflow");
    });

    it("fails if bTokenBalances[liquidator] overflows", async () => {
      await setBalance(bTokenCollateral, liquidator.address, UInt256Max());
      await expect(
        seize(bTokenCollateral, liquidator, borrower, seizeTokens)
      ).to.be.revertedWith("addition overflow");
    });

    it("succeeds, updates balances, and emits Transfer event", async () => {
      const beforeBalances = await getBalances(
        [bTokenCollateral],
        [liquidator.address, borrower.address]
      );
      const result = await seize(
        bTokenCollateral,
        liquidator,
        borrower,
        seizeTokens
      );
      const afterBalances = await getBalances(
        [bTokenCollateral],
        [liquidator.address, borrower.address]
      );
      const expectedBalances = await adjustBalances(beforeBalances, [
        [bTokenCollateral, liquidator.address, "tokens", seizeTokens],
        [bTokenCollateral, borrower.address, "tokens", -seizeTokens],
      ]);
      const receipt = await result.wait();
      expect(receipt.events[0].event).to.be.equal("Transfer");
      expect(receipt.events[0].args[0]).to.be.equal(borrower.address);
      expect(receipt.events[0].args[1]).to.be.equal(liquidator.address);
      expect(receipt.events[0].args[2]).to.be.equal(seizeTokens.toString());
      expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
    });
  });
});
