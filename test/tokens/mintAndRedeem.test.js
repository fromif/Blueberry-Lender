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
  quickMint,
  balanceOf,
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
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await comptroller.setMintAllowed(true);
  await comptroller.setMintVerify(true);
  await interestRateModel.setFailBorrowRate(false);
  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.ERC20_HARNESS,
    underlyingAddr
  );
  await underlying.harnessSetFailTransferFromAddress(minter.address, false);
  await bToken.harnessSetBalance(minter.address, 0);
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
  await preSupply(bToken, redeemer.address, redeemTokens);
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    comptrollerAddr
  );
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await comptroller.setMintAllowed(true);
  await comptroller.setMintVerify(true);
  await interestRateModel.setFailBorrowRate(false);
  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.ERC20_HARNESS,
    underlyingAddr
  );
  await underlying.harnessSetBalance(bToken.address, redeemAmount);
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
  let bToken, comptroller, underlying, interestRateModel;
  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({
      comptrollerOpts: { kind: "bool" },
      exchangeRate,
    });
    let comptrollerAddr = await bToken.comptroller();
    comptroller = await ethers.getContractAt(
      CONTRACT_NAMES.BOOL_COMPTROLLER,
      comptrollerAddr
    );
    let underlyingAddr = await bToken.underlying();
    underlying = await ethers.getContractAt(
      CONTRACT_NAMES.ERC20_HARNESS,
      underlyingAddr
    );
    let interestRateModelAddr = await bToken.interestRateModel();
    interestRateModel = await ethers.getContractAt(
      CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
      interestRateModelAddr
    );
  });

  describe("mintFresh", () => {
    beforeEach(async () => {
      await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if comptroller tells it to", async () => {
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
      await underlying.connect(minter).approve(bToken.address, 1);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "Insufficient allowance"
      );
    });

    it("fails if insufficient balance", async () => {
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
      await underlying.harnessSetFailTransferFromAddress(minter.address, true);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "transfer failed"
      );
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([bToken], [minter.address]);
      await expect(mintFresh(bToken, minter, mintAmount))
        .to.emit(bToken, "Mint")
        .withArgs(minter.address, mintAmount.toString(), mintTokens.toString())
        .to.emit(bToken, "Transfer")
        .withArgs(bToken.address, minter.address, mintTokens.toString());
      const afterBalances = await getBalances([bToken], [minter.address]);
      const expectedBalances = await adjustBalances(beforeBalances, [
        [bToken, minter.address, "cash", -mintAmount],
        [bToken, minter.address, "tokens", mintTokens],
        [bToken, "cash", mintAmount],
        [bToken, "tokens", mintTokens],
      ]);
      expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      await interestRateModel.setFailBorrowRate(true);
      await expect(quickMint(bToken, minter, mintAmount)).to.be.revertedWith(
        "INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      await underlying.harnessSetBalance(minter.address, 1);
      await expect(mintFresh(bToken, minter, mintAmount)).to.be.revertedWith(
        "Insufficient balance"
      );
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      await quickMint(bToken, minter, mintAmount);
      expect(mintTokens).to.be.not.equal(0);
      expect(await balanceOf(bToken, minter.address)).to.be.equal(mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      await expect(quickMint(bToken, minter, mintAmount))
        .to.emit(bToken, "AccrueInterest")
        .withArgs(0, 0, "1000000000000000000", 0);
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
        await underlying.harnessSetBalance(bToken.address, 1);
        await expect(
          redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("insufficient cash");
      });
      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          bToken.harnessSetExchangeRate(UInt256Max());
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
        await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount))
          .to.emit(bToken, "Redeem")
          .withArgs(
            redeemer.address,
            redeemAmount.toString(),
            redeemTokens.toString()
          )
          .to.emit(bToken, "Transfer")
          .withArgs(redeemer.address, bToken.address, redeemTokens.toString());
        const afterBalances = await getBalances([bToken], [redeemer.address]);
        const expectedBalances = await adjustBalances(beforeBalances, [
          [bToken, redeemer.address, "cash", redeemAmount],
          [bToken, redeemer.address, "tokens", -redeemTokens],
          [bToken, "cash", -redeemAmount],
          [bToken, "tokens", -redeemTokens],
        ]);
        expect(afterBalances.toString()).to.be.equal(
          expectedBalances.toString()
        );
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
      await interestRateModel.setFailBorrowRate(true);
      await expect(
        quickRedeem(bToken, redeemer, redeemTokens)
      ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      await setBalance(underlying, bToken.address, 0);
      await expect(
        quickRedeem(bToken, redeemer, redeemTokens, { exchangeRate })
      ).to.be.revertedWith("insufficient cash");
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      await underlying.harnessSetBalance(bToken.address, redeemAmount);
      await quickRedeem(bToken, redeemer, redeemTokens, { exchangeRate });
      expect(redeemAmount).to.be.not.equal(0);
      expect(await balanceOf(underlying, redeemer.address)).to.be.equal(
        redeemAmount
      );
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      await underlying.harnessSetBalance(bToken.address, redeemAmount);
      await quickRedeemUnderlying(bToken, redeemer, redeemAmount, {
        exchangeRate,
      });
      expect(redeemAmount).to.be.not.equal(0);
      expect(await balanceOf(underlying, redeemer.address)).to.be.equal(
        redeemAmount
      );
    });

    it("emits an AccrueInterest event", async () => {
      await expect(quickMint(bToken, minter, mintAmount))
        .to.emit(bToken, "AccrueInterest")
        .withArgs("500000000", 0, "1000000000000000000", 0);
    });
  });
});
