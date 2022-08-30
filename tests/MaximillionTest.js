const {
  etherBalance,
  etherGasCost
} = require('./Utils/Ethereum');

const {
  makeBToken,
  pretendBorrow,
  borrowSnapshot
} = require('./Utils/Compound');

describe('Maximillion', () => {
  let root, borrower;
  let maximillion, bWrapped;
  beforeEach(async () => {
    [root, borrower] = saddle.accounts;
    bWrapped = await makeBToken({kind: "bwrapped", supportMarket: true});
    maximillion = await deploy('Maximillion', [bWrapped._address]);
  });

  describe("constructor", () => {
    it("sets address of bWrapped", async () => {
      expect(await call(maximillion, "bWrappedNative")).toEqual(bWrapped._address);
    });
  });

  describe("repayBehalf", () => {
    it("refunds the entire amount with no borrows", async () => {
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost));
    });

    it("repays part of a borrow", async () => {
      await pretendBorrow(bWrapped, borrower, 1, 1, 150);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(bWrapped, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost).minus(100));
      expect(afterBorrowSnap.principal).toEqualNumber(50);
    });

    it("repays a full borrow and refunds the rest", async () => {
      await pretendBorrow(bWrapped, borrower, 1, 1, 90);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(bWrapped, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost).minus(90));
      expect(afterBorrowSnap.principal).toEqualNumber(0);
    });
  });
});
