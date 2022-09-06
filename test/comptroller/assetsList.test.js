const { expect } = require("chai");
const { ethers } = require("hardhat");
const { makeBToken, makeComptroller } = require("../utils/compound");

describe("assetListTest", () => {
  let customer, accounts;
  let comptroller;
  let allTokens, OMG, ZRX, BAT, SKT;

  beforeEach(async () => {
    [root, customer, ...accounts] = await ethers.getSigners();
    comptroller = await makeComptroller();
    allTokens = [OMG, ZRX, BAT, REP, DAI, SKT] = await Promise.all(
      ["OMG", "ZRX", "BAT", "REP", "DAI", "sketch"].map(async (name) =>
        makeBToken({
          comptroller,
          name,
          symbol: name,
          supportMarket: name != "sketch",
          underlyingPrice: 0.5,
        })
      )
    );
  });

  async function checkMarkets(expectedTokens) {
    for (let token of allTokens) {
      const isExpected = expectedTokens.some((e) => e.symbol == token.symbol);
      expect(
        await comptroller.checkMembership(customer.address, token.address)
      ).to.be.equal(isExpected);
    }
  }

  async function failToEnterMarkets(
    enterTokens,
    expectedTokens,
    expectedError
  ) {
    await expect(
      comptroller
        .connect(customer)
        .enterMarkets(enterTokens.map((t) => t.address))
    ).to.revertedWith(expectedError);

    const assetsIn = await comptroller.getAssetsIn(customer.address);
    expect(assetsIn.toString()).to.be.equal(
      expectedTokens.map((t) => t.address).toString()
    );

    await checkMarkets(expectedTokens);
  }

  async function enterAndCheckMarkets(enterTokens, expectedTokens) {
    const receipt = await comptroller
      .connect(customer)
      .enterMarkets(enterTokens.map((t) => t.address));
    const assetsIn = await comptroller.getAssetsIn(customer.address);
    expect(assetsIn.toString()).to.be.equal(
      expectedTokens.map((t) => t.address).toString()
    );
    await checkMarkets(expectedTokens);
    return receipt;
  }

  async function failToExitMarkets(exitToken, expectedTokens, expectedError) {
    await expect(
      comptroller.connect(customer).exitMarket(exitToken.address)
    ).to.be.revertedWith(expectedError);

    const assetsIn = await comptroller.getAssetsIn(customer.address);
    expect(assetsIn.toString()).to.be.equal(
      expectedTokens.map((t) => t.address).toString()
    );

    await checkMarkets(expectedTokens);
  }

  async function exitAndCheckMarkets(exitToken, expectedTokens) {
    await comptroller.connect(customer).exitMarket(exitToken.address);
    const assetsIn = await comptroller.getAssetsIn(customer.address);
    expect(assetsIn.toString()).to.be.equal(
      expectedTokens.map((t) => t.address).toString()
    );
    await checkMarkets(expectedTokens);
  }

  describe("enterMarkets", () => {
    it("properly emits events", async () => {
      const result1 = await enterAndCheckMarkets([OMG], [OMG]);
      const result2 = await enterAndCheckMarkets([OMG], [OMG]);
      expect(result1)
        .to.emit(comptroller, "MarketEntered")
        .withArgs(OMG.address, customer.address);
      const receipt2 = await result2.wait();
      expect(receipt2.events.toString()).to.be.equal("");
    });
    it("adds to the asset list only once", async () => {
      await enterAndCheckMarkets([OMG], [OMG]);
      await enterAndCheckMarkets([OMG], [OMG]);
      await enterAndCheckMarkets([ZRX, BAT, OMG], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([ZRX, OMG], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([ZRX], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([OMG], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([ZRX], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([BAT], [OMG, ZRX, BAT]);
    });
    it("the market must be listed for add to succeed", async () => {
      await failToEnterMarkets([SKT], [], "market not listed");
      await comptroller._supportMarket(SKT.address, 0);
      await enterAndCheckMarkets([SKT], [SKT]);
    });
    it("returns a list of codes mapping to user's ultimate membership in given addresses", async () => {
      await enterAndCheckMarkets(
        [OMG, ZRX, BAT],
        [OMG, ZRX, BAT],
        ["NO_ERROR", "NO_ERROR", "NO_ERROR"]
      );
      await failToEnterMarkets(
        [OMG, SKT],
        [OMG, ZRX, BAT],
        "market not listed"
      );
    });
  });

  describe("exitMarket", () => {
    it("doesn't let you exit if you have a borrow balance", async () => {
      await enterAndCheckMarkets([OMG], [OMG]);
      await OMG.harnessSetAccountBorrows(customer.address, 1, 1);
      await failToExitMarkets(OMG, [OMG], "nonzero borrow balance");
    });
    it("rejects unless redeem allowed", async () => {
      await enterAndCheckMarkets([OMG, BAT], [OMG, BAT]);
      await BAT.harnessSetAccountBorrows(customer.address, 1, 1);
      // BAT has a negative balance and there's no supply, thus account should be underwater
      await failToExitMarkets(OMG, [OMG, BAT], "insufficient liquidity");
    });
    it("accepts when you're not in the market already", async () => {
      await enterAndCheckMarkets([OMG, BAT], [OMG, BAT]);
      // Not in ZRX, should exit fine
      await exitAndCheckMarkets(ZRX, [OMG, BAT]);
    });
    it("properly removes when there's only one asset", async () => {
      await enterAndCheckMarkets([OMG], [OMG]);
      await exitAndCheckMarkets(OMG, []);
    });
    it("properly removes when there's only two assets, removing the first", async () => {
      await enterAndCheckMarkets([OMG, BAT], [OMG, BAT]);
      await exitAndCheckMarkets(OMG, [BAT]);
    });
    it("properly removes when there's only two assets, removing the second", async () => {
      await enterAndCheckMarkets([OMG, BAT], [OMG, BAT]);
      await exitAndCheckMarkets(BAT, [OMG]);
    });
    it("properly removes when there's only three assets, removing the first", async () => {
      await enterAndCheckMarkets([OMG, BAT, ZRX], [OMG, BAT, ZRX]);
      await exitAndCheckMarkets(OMG, [ZRX, BAT]);
    });
    it("properly removes when there's only three assets, removing the second", async () => {
      await enterAndCheckMarkets([OMG, BAT, ZRX], [OMG, BAT, ZRX]);
      await exitAndCheckMarkets(BAT, [OMG, ZRX]);
    });
    it("properly removes when there's only three assets, removing the third", async () => {
      await enterAndCheckMarkets([OMG, BAT, ZRX], [OMG, BAT, ZRX]);
      await exitAndCheckMarkets(ZRX, [OMG, BAT]);
    });
  });

  describe("entering from borrowAllowed", () => {
    it("enters when called by a btoken", async () => {
      await BAT.connect(customer).harnessCallBorrowAllowed(1);
      const assetsIn = await comptroller.getAssetsIn(customer.address);
      expect(BAT.address).to.be.equal(assetsIn.toString());
      await checkMarkets([BAT]);
    });
    it("reverts when called by not a btoken", async () => {
      await expect(
        comptroller
          .connect(customer)
          .borrowAllowed(BAT.address, customer.address, 1)
      ).to.be.revertedWith("sender must be bToken");
      const assetsIn = await comptroller.getAssetsIn(customer.address);
      expect(assetsIn.toString()).to.be.equal("");
    });
    it("adds to the asset list only once", async () => {
      await BAT.connect(customer).harnessCallBorrowAllowed(1);
      await enterAndCheckMarkets([BAT], [BAT]);
      await BAT.connect(customer).harnessCallBorrowAllowed(1);
      const assetsIn = await comptroller.getAssetsIn(customer.address);
      expect(BAT.address).to.be.equal(assetsIn.toString());
    });
  });
});
