const { expect } = require("chai");
const { ethers, web3 } = require("hardhat");
const {
  makeBToken,
  getBalances,
  adjustBalances,
} = require("../utils/compound");

const exchangeRate = 5;

describe("BEther", function () {
  let root, nonRoot, accounts;
  let bToken;
  beforeEach(async () => {
    [root, nonRoot, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({
      kind: "bether",
      comptrollerOpts: { kind: "bool" },
    });
  });

  describe("getCashPrior", () => {
    it("returns the amount of ether held by the bEther contract before the current message", async () => {
      expect(
        await bToken.callStatic.harnessGetCashPrior({ value: 100 })
      ).to.be.equal(0);
    });
  });

  describe("doTransferIn", () => {
    it("succeeds if from is msg.nonRoot and amount is msg.value", async () => {
      expect(
        await bToken.callStatic.harnessDoTransferIn(root.address, 100, {
          value: 100,
        })
      ).to.be.equal(100);
    });

    it("reverts if from != msg.sender", async () => {
      await expect(
        bToken.harnessDoTransferIn(nonRoot.address, 100, { value: 100 })
      ).to.be.revertedWith("sender mismatch");
    });

    it("reverts if amount != msg.value", async () => {
      await expect(
        bToken.harnessDoTransferIn(root.address, 77, { value: 100 })
      ).to.be.revertedWith("value mismatch");
    });

    describe("doTransferOut", () => {
      it("transfers ether out", async () => {
        const beforeBalances = await getBalances([bToken], [nonRoot.address]);
        await bToken.harnessDoTransferOut(nonRoot.address, 77, { value: 77 });
        const afterBalances = await getBalances([bToken], [nonRoot.address]);
        const expectedBalances = await adjustBalances(beforeBalances, [
          [bToken, nonRoot.address, "eth", 77],
        ]);
        expect(afterBalances.toString()).to.be.equal(
          expectedBalances.toString()
        );
      });

      it("reverts if it fails", async () => {
        await expect(
          bToken.harnessDoTransferOut(root.address, 77, { value: 0 })
        ).to.be.revertedWithoutReason();
      });
    });
  });
});
