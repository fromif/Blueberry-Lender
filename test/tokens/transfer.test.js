const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { preApprove, makeBToken } = require("../utils/compound");
const { etherUnsigned, etherMantissa } = require("../utils/ethereum");

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);

async function preMint(bToken, minter, mintAmount, exchangeRate) {
  await preApprove(bToken, minter, mintAmount);
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.COMPTROLLER_HARNESS,
    comptrollerAddr
  );
  await comptroller.setMintAllowed(true);
  await comptroller.setMintVerify(true);
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);
  const bTokenUnderlyingAddr = await bToken.underlying();
  const bTokenUnderlying = await ethers.getContractAt(
    CONTRACT_NAMES.ERC20_HARNESS,
    bTokenUnderlyingAddr
  );
  await bTokenUnderlying.harnessSetFailTransferFromAddress(minter, false);
  await bToken.harnessSetBalance(minter, 0);
  await bToken.harnessSetExchangeRate(etherMantissa(exchangeRate));
}

async function mintFresh(bToken, minter, mintAmount) {
  return bToken.harnessMintFresh(minter, mintAmount);
}

describe("BToken", function () {
  let root, minter, accounts;
  beforeEach(async () => {
    [root, minter, ...accounts] = await ethers.getSigners();
  });

  describe("transfer", () => {
    it("cannot transfer from a zero balance", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      expect(await bToken.balanceOf(root.address)).to.be.equal(0);
      await expect(
        bToken.transfer(accounts[0].address, 100)
      ).to.be.revertedWith("subtraction underflow");
    });

    it("transfers 50 tokens", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      await bToken.harnessSetBalance(root.address, 100);
      expect(await bToken.balanceOf(root.address)).to.be.equal(100);
      await bToken.transfer(accounts[0].address, 50);
      expect(await bToken.balanceOf(root.address)).to.be.equal(50);
      expect(await bToken.balanceOf(accounts[0].address)).to.be.equal(50);
    });

    it("doesn't transfer when src == dst", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      await bToken.harnessSetBalance(root.address, 100);
      expect(await bToken.balanceOf(root.address)).to.be.equal(100);
      await expect(bToken.transfer(root.address, 50)).to.be.revertedWith(
        "bad input"
      );
    });

    it("rejects transfer when not allowed and reverts if not verified", async () => {
      const bToken = await makeBToken({ comptrollerOpts: { kind: "bool" } });
      await bToken.harnessSetBalance(root.address, 100);
      expect(await bToken.balanceOf(root.address)).to.be.equal(100);

      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.BOOL_COMPTROLLER,
        comptrollerAddr
      );
      await comptroller.setTransferAllowed(false);
      await expect(bToken.transfer(root.address, 50)).to.be.revertedWith(
        "rejected"
      );

      await comptroller.setTransferAllowed(true);
      await comptroller.setTransferVerify(false);
      await expect(bToken.transfer(accounts[0].address, 50)).to.be.revertedWith(
        "transferVerify rejected transfer"
      );
    });

    describe("transfer ccollateralcap token", () => {
      it("transfers collateral tokens", async () => {
        const bToken = await makeBToken({
          kind: "bcollateralcap",
          supportMarket: true,
        });
        await bToken.harnessSetBalance(root.address, 100);
        await bToken.harnessSetCollateralBalance(root.address, 100);
        await bToken.harnessSetTotalSupply(100);
        await bToken.harnessSetTotalCollateralTokens(100);

        expect(await bToken.balanceOf(root.address)).to.be.equal(100);
        expect(await bToken.accountCollateralTokens(root.address)).to.be.equal(
          100
        );
        expect(await bToken.accountCollateralTokens(root.address)).to.be.equal(
          100
        );
        await bToken.transfer(accounts[0].address, 50);
        expect(await bToken.balanceOf(root.address)).to.be.equal(50);
        expect(await bToken.accountCollateralTokens(root.address)).to.be.equal(
          50
        );
        expect(await bToken.balanceOf(accounts[0].address)).to.be.equal(50);
        expect(
          await bToken.accountCollateralTokens(accounts[0].address)
        ).to.be.equal(50);
      });

      it("transfers non-collateral tokens", async () => {
        const bToken = await makeBToken({
          kind: "bcollateralcap",
          supportMarket: true,
        });
        await bToken.harnessSetBalance(root.address, 100);
        await bToken.harnessSetCollateralBalance(root.address, 50);
        await bToken.harnessSetTotalSupply(100);
        await bToken.harnessSetTotalCollateralTokens(50);

        expect(await bToken.balanceOf(root.address)).to.be.equal(100);
        expect(await bToken.accountCollateralTokens(root.address)).to.be.equal(
          50
        );
        await bToken.transfer(accounts[0].address, 50);
        expect(await bToken.balanceOf(root.address)).to.be.equal(50);
        expect(await bToken.accountCollateralTokens(root.address)).to.be.equal(
          50
        );
        expect(await bToken.balanceOf(accounts[0].address)).to.be.equal(50);
        expect(
          await bToken.accountCollateralTokens(accounts[0].address)
        ).to.be.equal(0);
      });

      it("transfers partial collateral tokens", async () => {
        const bToken = await makeBToken({
          kind: "bcollateralcap",
          supportMarket: true,
        });
        await bToken.harnessSetBalance(root.address, 100);
        await bToken.harnessSetCollateralBalance(root.address, 80);
        await bToken.harnessSetTotalSupply(100);
        await bToken.harnessSetTotalCollateralTokens(80);

        expect(await bToken.balanceOf(root.address)).to.be.equal(100);
        expect(await bToken.accountCollateralTokens(root.address)).to.be.equal(
          80
        );
        await bToken.transfer(accounts[0].address, 50);
        expect(await bToken.balanceOf(root.address)).to.be.equal(50);
        expect(await bToken.accountCollateralTokens(root.address)).to.be.equal(
          50
        );
        expect(await bToken.balanceOf(accounts[0].address)).to.be.equal(50);
        expect(
          await bToken.accountCollateralTokens(accounts[0].address)
        ).to.be.equal(30);
      });
    });
  });
});
