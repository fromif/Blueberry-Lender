const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const {
  makeComptroller,
  makeBToken,
  setOraclePrice,
} = require("../utils/compound");
const { etherUnsigned, UInt256Max } = require("../utils/ethereum");

const borrowedPrice = BigNumber.from(10).pow(10).mul(2);
const collateralPrice = BigNumber.from(10).pow(18);
const repayAmount = BigNumber.from(10).pow(18);

function calculateSeizeTokens(
  comptroller,
  bTokenBorrowed,
  bTokenCollateral,
  repayAmount
) {
  return comptroller.liquidateCalculateSeizeTokens(
    bTokenBorrowed.address,
    bTokenCollateral.address,
    repayAmount
  );
}

function rando(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

describe("Comptroller", () => {
  let root, accounts;
  let comptroller, bTokenBorrowed, bTokenCollateral;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    comptroller = await makeComptroller();
    bTokenBorrowed = await makeBToken({
      comptroller: comptroller,
      underlyingPrice: 0,
    });
    bTokenCollateral = await makeBToken({
      comptroller: comptroller,
      underlyingPrice: 0,
    });
  });

  beforeEach(async () => {
    await setOraclePrice(bTokenBorrowed, borrowedPrice);
    await setOraclePrice(bTokenCollateral, collateralPrice);
    await bTokenCollateral.harnessExchangeRateDetails(8e10, 4e10, 0);
  });

  describe("liquidateCalculateAmountSeize", () => {
    it("fails if either asset price is 0", async () => {
      await setOraclePrice(bTokenBorrowed, 0);
      await expect(
        calculateSeizeTokens(
          comptroller,
          bTokenBorrowed,
          bTokenCollateral,
          repayAmount
        )
      ).to.be.revertedWith("price error");

      await setOraclePrice(bTokenCollateral, 0);
      await expect(
        calculateSeizeTokens(
          comptroller,
          bTokenBorrowed,
          bTokenCollateral,
          repayAmount
        )
      ).to.be.revertedWith("price error");
    });

    it("fails if the repayAmount causes overflow ", async () => {
      await expect(
        calculateSeizeTokens(
          comptroller,
          bTokenBorrowed,
          bTokenCollateral,
          UInt256Max()
        )
      ).to.be.revertedWith("multiplication overflow");
    });

    it("fails if the borrowed asset price causes overflow ", async () => {
      await setOraclePrice(bTokenBorrowed, -1);
      await expect(
        calculateSeizeTokens(
          comptroller,
          bTokenBorrowed,
          bTokenCollateral,
          repayAmount
        )
      ).to.be.revertedWith("multiplication overflow");
    });

    it("reverts if it fails to calculate the exchange rate", async () => {
      await bTokenCollateral.harnessExchangeRateDetails(1, 0, 10); // (1 - 10) -> underflow
      await expect(
        comptroller.liquidateCalculateSeizeTokens(
          bTokenBorrowed.address,
          bTokenCollateral.address,
          repayAmount
        )
      ).to.be.revertedWith("subtraction underflow");
    });

    [
      [
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
      ],
      [
        ethers.utils.parseEther("2"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
      ],
      [
        ethers.utils.parseEther("2"),
        ethers.utils.parseEther("2"),
        ethers.utils.parseEther("1.42"),
        ethers.utils.parseEther("1.3"),
        ethers.utils.parseEther("2.45"),
      ],
      [
        ethers.utils.parseEther("2.789"),
        ethers.utils.parseEther("5.230480842"),
        ethers.utils.parseEther("771.32"),
        ethers.utils.parseEther("1.3"),
        ethers.utils.parseEther("10002.45"),
      ],
      [
        ethers.utils.parseEther("7.009232529961056").mul(1000000),
        ethers.utils.parseEther("2.5278726317240445").mul(1000000),
        ethers.utils.parseEther("2.6177112093242585").mul(100000),
        ethers.utils.parseEther("1.179713989619784"),
        ethers.utils.parseEther("7.790468414639561").mul(1000000),
      ],
    ].forEach((testCase) => {
      it(`returns the correct value for ${testCase}`, async () => {
        const [
          exchangeRate,
          borrowedPrice,
          collateralPrice,
          liquidationIncentive,
          repayAmount,
        ] = testCase;

        await setOraclePrice(bTokenCollateral, collateralPrice);
        await setOraclePrice(bTokenBorrowed, borrowedPrice);
        await comptroller._setLiquidationIncentive(liquidationIncentive);
        await bTokenCollateral.harnessSetExchangeRate(exchangeRate);

        const seizeAmount = repayAmount
          .mul(liquidationIncentive)
          .mul(borrowedPrice)
          .div(collateralPrice);
        const seizeTokens = seizeAmount.div(exchangeRate);

        const receipt = await calculateSeizeTokens(
          comptroller,
          bTokenBorrowed,
          bTokenCollateral,
          repayAmount
        );
        expect(receipt[0]).to.be.equal(0);
        expect(seizeTokens.sub(receipt[1])).to.be.below(
          ethers.utils.parseEther("0.000001")
        );
      });
    });
  });
});
