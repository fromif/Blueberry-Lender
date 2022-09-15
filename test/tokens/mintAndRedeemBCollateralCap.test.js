const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  preApprove,
  preSupply,
  makeBToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  balanceOf,
  collateralTokenBalance,
  totalSupply,
  totalCollateralTokens,
  quickMint,
  quickRedeem,
  quickRedeemUnderlying,
} = require("../utils/compound");
const {
  etherUnsigned,
  etherMantissa,
  UInt256Max,
} = require("../utils/ethereum");

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.mul(exchangeRate);

async function preMint(bToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(bToken, minter, mintAmount);
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
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
  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.ERC20_HARNESS,
    underlyingAddr
  );
  await underlying.harnessSetFailTransferFromAddress(minter.address, false);
  await bToken.harnessSetBalance(minter.address, 0);
  await bToken.harnessSetCollateralBalance(minter.address, 0);
  await bToken.harnessSetExchangeRate(etherMantissa(exchangeRate));
}

async function mintFresh(bToken, minter, mintAmount) {
  return bToken.harnessMintFresh(minter.address, mintAmount);
}

async function preRedeem(
  bToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  await preSupply(bToken, redeemer.address, redeemTokens, {
    totalCollateralTokens: true,
  });
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    comptrollerAddr
  );
  await comptroller.setRedeemAllowed(true);
  await comptroller.setRedeemVerify(true);
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);
  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.ERC20_HARNESS,
    underlyingAddr
  );
  await underlying.harnessSetBalance(bToken.address, redeemAmount);
  await bToken.harnessSetInternalCash(redeemAmount);
  await underlying.harnessSetBalance(redeemer.address, 0);
  await underlying.harnessSetFailTransferToAddress(redeemer.address, false);
  await bToken.harnessSetExchangeRate(etherMantissa(exchangeRate));
}

async function redeemFreshTokens(bToken, redeemer, redeemTokens, redeemAmount) {
  return bToken.harnessRedeemFresh(redeemer.address, redeemTokens, 0);
}

async function redeemFreshAmount(bToken, redeemer, redeemTokens, redeemAmount) {
  return bToken.harnessRedeemFresh(redeemer.address, 0, redeemAmount);
}

describe("BToken", function () {
  let root, minter, redeemer, accounts;
  let bToken;
  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({
      kind: "bcollateralcap",
      comptrollerOpts: { kind: "bool" },
      exchangeRate,
    });
  });

  describe("mintFresh", () => {
    beforeEach(async () => {
      await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if comptroller tells it to", async () => {
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.BOOL_COMPTROLLER,
        comptrollerAddr
      );
      await comptroller.setMintAllowed(false);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "rejected"
      );
    });

    it("proceeds if comptroller tells it to", async () => {
      await mintFresh(bToken, minter, mintAmount);
    });

    it("fails if not fresh", async () => {
      await fastForward(bToken);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "market is stale"
      );
    });

    it("continues if fresh", async () => {
      await bToken.accrueInterest();
      await mintFresh(bToken, minter, mintAmount);
    });

    it("fails if insufficient approval", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await underlying.connect(minter).approve(bToken.address, 1);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "Insufficient allowance"
      );
    });

    it("fails if insufficient balance", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await setBalance(underlying, minter.address, 1);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "Insufficient balance"
      );
    });

    it("proceeds if sufficient approval and balance", async () => {
      await mintFresh(bToken, minter, mintAmount);
    });

    it("fails if exchange calculation fails", async () => {
      await bToken.harnessSetExchangeRate(0);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "divide by zero"
      );
    });

    it("fails if transferring in fails", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await underlying.harnessSetFailTransferFromAddress(minter.address, true);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "transfer failed"
      );
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([bToken], [minter.address]);
      const result = await mintFresh(bToken, minter, mintAmount);
      const afterBalances = await getBalances([bToken], [minter.address]);
      const expectedBalances = await adjustBalances(beforeBalances, [
        [bToken, minter.address, "cash", -mintAmount],
        [bToken, minter.address, "tokens", mintTokens],
        [bToken, "cash", mintAmount],
        [bToken, "tokens", mintTokens],
      ]);
      const receipt = await result.wait();
      expect(receipt.events[3].event).to.be.equal("Mint");
      expect(receipt.events[3].args[0]).to.be.equal(minter.address);
      expect(receipt.events[3].args[1]).to.be.equal(mintAmount.toString());
      expect(receipt.events[3].args[2]).to.be.equal(mintTokens.toString());

      expect(receipt.events[4].event).to.be.equal("Transfer");
      expect(receipt.events[4].args[0]).to.be.equal(bToken.address);
      expect(receipt.events[4].args[1]).to.be.equal(minter.address);
      expect(receipt.events[4].args[2]).to.be.equal(mintTokens.toString());
      expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
    });

    it("succeeds and not reach collateracl cap", async () => {
      await bToken._setCollateralCap(mintTokens);
      await mintFresh(bToken, minter, mintAmount);

      const balance = await balanceOf(bToken, minter.address);
      const collateralTokens = await collateralTokenBalance(
        bToken,
        minter.address
      );
      const total = await totalSupply(bToken);
      const totalCollateral = await totalCollateralTokens(bToken);
      expect(balance).to.be.equal(collateralTokens);
      expect(total).to.be.equal(totalCollateral);
    });

    it("succeeds but reach collateracl cap", async () => {
      await bToken._setCollateralCap(mintTokens.sub(1));
      await mintFresh(bToken, minter, mintAmount);

      const balance = await balanceOf(bToken, minter.address);
      const collateralTokens = await collateralTokenBalance(
        bToken,
        minter.address
      );
      const total = await totalSupply(bToken);
      const totalCollateral = await totalCollateralTokens(bToken);
      expect(balance.sub(1)).to.be.equal(collateralTokens);
      expect(total.sub(1)).to.be.equal(totalCollateral);
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      const interestRateModelAddr = await bToken.interestRateModel();
      const interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(true);
      await expect(quickMint(bToken, minter, mintAmount)).to.be.revertedWith(
        "INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await underlying.harnessSetBalance(minter.address, 1);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "Insufficient balance"
      );
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      await quickMint(bToken, minter, mintAmount);
      expect(mintTokens).to.not.be.equal(0);
      expect(await balanceOf(bToken, minter.address)).to.be.equal(mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      const result = await quickMint(bToken, minter, mintAmount);
      const receipt = await result.wait();
      expect(receipt.events[0].event).to.be.equal("AccrueInterest");
      expect(receipt.events[0].args[0]).to.be.equal("0");
      expect(receipt.events[0].args[1]).to.be.equal("0");
      expect(receipt.events[0].args[2]).to.be.equal("1000000000000000000");
      expect(receipt.events[0].args[3]).to.be.equal("0");
    });
  });

  [redeemFreshTokens, redeemFreshAmount].forEach((redeemFresh) => {
    describe(redeemFresh.name, () => {
      beforeEach(async () => {
        await preRedeem(
          bToken,
          redeemer,
          redeemTokens,
          redeemAmount,
          exchangeRate
        );
      });

      it("fails if comptroller tells it to", async () => {
        const comptrollerAddr = await bToken.comptroller();
        const comptroller = await ethers.getContractAt(
          CONTRACT_NAMES.BOOL_COMPTROLLER,
          comptrollerAddr
        );
        await comptroller.setRedeemAllowed(false);
        await expect(
          redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("rejected");
      });

      it("fails if not fresh", async () => {
        await fastForward(bToken);
        await expect(
          redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("market is stale");
      });

      it("continues if fresh", async () => {
        await bToken.accrueInterest();
        await redeemFresh(bToken, redeemer, redeemTokens, redeemAmount);
      });

      it("fails if insufficient protocol cash to transfer out", async () => {
        const underlyingAddr = await bToken.underlying();
        const underlying = await ethers.getContractAt(
          CONTRACT_NAMES.WETH9,
          underlyingAddr
        );
        await underlying.harnessSetBalance(bToken.address, 1);
        await bToken.harnessSetInternalCash(1);
        await expect(
          redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("insufficient cash");
      });

      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          await bToken.harnessSetExchangeRate(UInt256Max());
          await expect(
            redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
          ).to.be.revertedWith("multiplication overflow");
        } else {
          await bToken.harnessSetExchangeRate(0);
          await expect(
            redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
          ).to.be.revertedWith("divide by zero");
        }
      });

      it("fails if transferring out fails", async () => {
        const underlyingAddr = await bToken.underlying();
        const underlying = await ethers.getContractAt(
          CONTRACT_NAMES.ERC20_HARNESS,
          underlyingAddr
        );
        await underlying.harnessSetFailTransferToAddress(
          redeemer.address,
          true
        );
        await expect(
          redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("transfer failed");
      });

      it("fails if total supply < redemption amount", async () => {
        await bToken.harnessExchangeRateDetails(0, 0, 0);
        await expect(
          redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("subtraction underflow");
      });

      it("reverts if new account balance underflows", async () => {
        await bToken.harnessSetBalance(redeemer.address, 0);
        await expect(
          redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("subtraction underflow");
      });

      it("transfers the underlying cash, tokens, and emits Redeem, Transfer events", async () => {
        const beforeBalances = await getBalances([bToken], [redeemer.address]);
        const result = await redeemFresh(
          bToken,
          redeemer,
          redeemTokens,
          redeemAmount
        );
        const afterBalances = await getBalances([bToken], [redeemer.address]);
        const expectedBalances = await adjustBalances(beforeBalances, [
          [bToken, redeemer.address, "cash", redeemAmount],
          [bToken, redeemer.address, "tokens", -redeemTokens],
          [bToken, "cash", -redeemAmount],
          [bToken, "tokens", -redeemTokens],
        ]);

        const receipt = await result.wait();

        expect(receipt.events[4].event).to.be.equal("Redeem");
        expect(receipt.events[4].args[0]).to.be.equal(redeemer.address);
        expect(receipt.events[4].args[1]).to.be.equal(redeemAmount.toString());
        expect(receipt.events[4].args[2]).to.be.equal(redeemTokens.toString());

        expect(receipt.events[3].event).to.be.equal("Transfer");
        expect(receipt.events[3].args[0]).to.be.equal(redeemer.address);
        expect(receipt.events[3].args[1]).to.be.equal(bToken.address);
        expect(receipt.events[3].args[2]).to.be.equal(redeemTokens.toString());

        expect(afterBalances.toString()).to.be.equal(
          expectedBalances.toString()
        );
      });

      it("succeeds and not consume collateral", async () => {
        await bToken.harnessSetBalance(redeemer.address, redeemTokens.mul(3));
        await bToken.harnessSetCollateralBalance(
          redeemer.address,
          redeemTokens
        );
        await bToken.harnessSetTotalSupply(redeemTokens.mul(3));
        await bToken.harnessSetTotalCollateralTokens(redeemTokens);
        await bToken.harnessSetCollateralBalanceInit(redeemer.address);

        await redeemFresh(bToken, redeemer, redeemTokens, redeemAmount);

        // balance:          30000 -> 20000
        // collateralTokens: 10000 -> 10000
        // total:            30000 -> 20000
        // totalCollateral:  10000 -> 10000
        const balance = await balanceOf(bToken, redeemer.address);
        const collateralTokens = await collateralTokenBalance(
          bToken,
          redeemer.address
        );
        const total = await totalSupply(bToken);
        const totalCollateral = await totalCollateralTokens(bToken);
        expect(balance).to.be.equal(collateralTokens.mul(2));
        expect(total).to.be.equal(totalCollateral.mul(2));
      });

      it("succeeds but consume partial collateral", async () => {
        await bToken.harnessSetBalance(redeemer.address, redeemTokens.add(1));
        await bToken.harnessSetCollateralBalance(
          redeemer.address,
          redeemTokens
        );
        await bToken.harnessSetTotalSupply(redeemTokens.add(1));
        await bToken.harnessSetTotalCollateralTokens(redeemTokens);
        await bToken.harnessSetCollateralBalanceInit(redeemer.address);

        await redeemFresh(bToken, redeemer, redeemTokens, redeemAmount);

        // balance:          10001 -> 1
        // collateralTokens: 10000 -> 1
        // total:            10001 -> 1
        // totalCollateral:  10000 -> 1
        const balance = await balanceOf(bToken, redeemer.address);
        const collateralTokens = await collateralTokenBalance(
          bToken,
          redeemer.address
        );
        const total = await totalSupply(bToken);
        const totalCollateral = await totalCollateralTokens(bToken);
        expect(balance).to.be.equal(collateralTokens);
        expect(total).to.be.equal(totalCollateral);
      });
    });
  });

  describe("redeem", () => {
    beforeEach(async () => {
      await preRedeem(
        bToken,
        redeemer,
        redeemTokens,
        redeemAmount,
        exchangeRate
      );
    });

    it("emits a redeem failure if interest accrual fails", async () => {
      const interestRateModelAddr = await bToken.interestRateModel();
      const interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(true);
      await expect(
        quickRedeem(bToken, redeemer, redeemTokens)
      ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await setBalance(underlying, bToken.address, 0);
      await bToken.harnessSetInternalCash(0);
      await expect(
        quickRedeem(bToken, redeemer, redeemTokens)
      ).to.be.revertedWith("insufficient cash");
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );

      await underlying.harnessSetBalance(bToken.address, redeemAmount);
      await quickRedeem(bToken, redeemer, redeemTokens, { exchangeRate });
      expect(redeemAmount).to.not.be.equal(0);
      expect(await balanceOf(underlying, redeemer.address)).to.be.equal(
        redeemAmount
      );
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await underlying.harnessSetBalance(bToken.address, redeemAmount);
      await quickRedeemUnderlying(bToken, redeemer, redeemAmount, {
        exchangeRate,
      });
      expect(redeemAmount).to.not.be.equal(0);
      expect(await balanceOf(underlying, redeemer.address)).to.be.equal(
        redeemAmount
      );
    });

    it("emits an AccrueInterest event", async () => {
      const result = await quickMint(bToken, minter, mintAmount);
      const receipt = await result.wait();
      expect(receipt.events[0].event).to.be.equal("AccrueInterest");
      expect(receipt.events[0].args[0]).to.be.equal("500000000");
      expect(receipt.events[0].args[1]).to.be.equal("0");
      expect(receipt.events[0].args[2]).to.be.equal("1000000000000000000");
      expect(receipt.events[0].args[3]).to.be.equal("0");
    });
  });
});
