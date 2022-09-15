const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  makeBTokenAdmin,
  makeBToken,
  makeComptroller,
  makeInterestRateModel,
  makeToken,
} = require("../utils/compound");
const { etherMantissa, etherUnsigned } = require("../utils/ethereum");

describe("BTokenAdmin", () => {
  let bTokenAdmin, bToken, root, accounts, admin, reserveManager;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    admin = accounts[1];
    reserveManager = accounts[2];
    others = accounts[3];
    bTokenAdmin = await makeBTokenAdmin({ admin: admin });
  });

  describe("getBTokenAdmin", () => {
    it("it is normal admin", async () => {
      bToken = await makeBToken();
      expect(await bTokenAdmin.getBTokenAdmin(bToken.address)).to.be.equal(
        root.address
      );
    });

    it("it is bToken admin contract", async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
      expect(await bTokenAdmin.getBTokenAdmin(bToken.address)).to.be.equal(
        bTokenAdmin.address
      );
    });
  });

  describe("_queuePendingAdmin()", () => {
    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._queuePendingAdmin(bToken.address, others.address)
      ).to.be.revertedWith("only the admin may call this function");

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should properly queue pending admin", async () => {
      await bTokenAdmin.setBlockTimestamp(100);

      await bTokenAdmin
        .connect(admin)
        ._queuePendingAdmin(bToken.address, others.address);

      expect(
        await bTokenAdmin.adminQueue(bToken.address, others.address)
      ).to.be.equal("172900"); // 100 + 86400

      await expect(
        bTokenAdmin
          .connect(admin)
          ._queuePendingAdmin(bToken.address, others.address)
      ).to.be.revertedWith("already in queue");

      // Check admin and pending admin stay the same
      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("_clearPendingAdmin()", () => {
    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._clearPendingAdmin(bToken.address, others.address)
      ).to.be.revertedWith("only the admin may call this function");

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should properly clear pending admin", async () => {
      await bTokenAdmin.setBlockTimestamp(100);

      await bTokenAdmin
        .connect(admin)
        ._clearPendingAdmin(bToken.address, others.address);

      expect(
        await bTokenAdmin.adminQueue(bToken.address, others.address)
      ).to.be.equal("0");

      // Check admin and pending admin stay the same
      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("_togglePendingAdmin()", () => {
    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._togglePendingAdmin(bToken.address, others.address)
      ).to.be.revertedWith("only the admin may call this function");

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("cannot be toggled if not in queue", async () => {
      await expect(
        bTokenAdmin
          .connect(admin)
          ._togglePendingAdmin(bToken.address, others.address)
      ).to.be.revertedWith("not in queue");

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("cannot be toggled if queue not expired", async () => {
      await bTokenAdmin.setBlockTimestamp(100);

      await bTokenAdmin
        .connect(admin)
        ._queuePendingAdmin(bToken.address, others.address);

      expect(
        await bTokenAdmin.adminQueue(bToken.address, others.address)
      ).to.be.equal("172900"); // 100 + 86400

      await bTokenAdmin.setBlockTimestamp(86499);

      await expect(
        bTokenAdmin
          .connect(admin)
          ._togglePendingAdmin(bToken.address, others.address)
      ).to.be.revertedWith("queue not expired");

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should properly set pending admin", async () => {
      await bTokenAdmin.setBlockTimestamp(100);

      await bTokenAdmin
        .connect(admin)
        ._queuePendingAdmin(bToken.address, others.address);

      expect(
        await bTokenAdmin.adminQueue(bToken.address, others.address)
      ).to.be.equal("172900"); // 100 + 86400

      await bTokenAdmin.setBlockTimestamp(172900);

      await bTokenAdmin
        .connect(admin)
        ._togglePendingAdmin(bToken.address, others.address);

      expect(
        await bTokenAdmin.adminQueue(bToken.address, others.address)
      ).to.be.equal("0");

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(others.address);
    });
  });

  describe("_acceptAdmin()", () => {
    beforeEach(async () => {
      bToken = await makeBToken();
      await bToken._setPendingAdmin(bTokenAdmin.address);
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin.connect(others)._acceptAdmin(bToken.address)
      ).to.be.revertedWith("only the admin may call this function");

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(root.address);
      expect(await bToken.pendingAdmin()).to.be.equal(bTokenAdmin.address);
    });

    it("should succeed and set admin and clear pending admin", async () => {
      await bTokenAdmin.connect(admin)._acceptAdmin(bToken.address);

      expect(await bToken.admin()).to.be.equal(bTokenAdmin.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("_setComptroller()", () => {
    let oldComptroller, newComptroller;

    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
      let oldComptrollerAddr = await bToken.comptroller();
      oldComptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER_HARNESS,
        oldComptrollerAddr
      );
      newComptroller = await makeComptroller();
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._setComptroller(bToken.address, newComptroller.address)
      ).to.be.revertedWith("only the admin may call this function");

      expect(await bToken.comptroller()).to.be.equal(oldComptroller.address);
    });

    it("should succeed and set new comptroller", async () => {
      await bTokenAdmin
        .connect(admin)
        ._setComptroller(bToken.address, newComptroller.address);

      expect(await bToken.comptroller()).to.be.equal(newComptroller.address);
    });
  });

  describe("_setReserveFactor()", () => {
    const factor = etherMantissa(0.02);

    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin.connect(others)._setReserveFactor(bToken.address, factor)
      ).to.be.revertedWith("only the admin may call this function");

      expect(await bToken.reserveFactorMantissa()).to.be.equal(0);
    });

    it("should succeed and set new reserve factor", async () => {
      await bTokenAdmin
        .connect(admin)
        ._setReserveFactor(bToken.address, factor);

      expect(await bToken.reserveFactorMantissa()).to.be.equal(factor);
    });
  });

  describe("_reduceReserves()", () => {
    const reserves = etherUnsigned((3e12).toFixed().toString());
    const cash = etherUnsigned(reserves.mul(2));
    const reduction = etherUnsigned((2e12).toFixed().toString());
    let interestRateModel, underlying;

    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
      const interestRateModelAddr = await bToken.interestRateModel();
      interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(false);
      await bToken.harnessSetTotalReserves(reserves);
      const underlyingAddr = await bToken.underlying();
      underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await underlying.harnessSetBalance(bToken.address, cash);
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin.connect(others)._reduceReserves(bToken.address, reduction)
      ).to.be.revertedWith("only the admin may call this function");

      expect(await underlying.balanceOf(bTokenAdmin.address)).to.be.equal(0);
    });

    it("should succeed and reduce reserves", async () => {
      await bTokenAdmin
        .connect(admin)
        ._reduceReserves(bToken.address, reduction);

      expect(await underlying.balanceOf(bTokenAdmin.address)).to.be.equal(
        reduction
      );
    });
  });

  describe("_setInterestRateModel()", () => {
    let oldModel, newModel;

    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
      const interestRateModelAddr = await bToken.interestRateModel();
      oldModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      newModel = await makeInterestRateModel();
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._setInterestRateModel(bToken.address, newModel.address)
      ).to.be.revertedWith("only the admin may call this function");

      expect(await bToken.interestRateModel()).to.be.equal(oldModel.address);
    });

    it("should succeed and set new interest rate model", async () => {
      await bTokenAdmin
        .connect(admin)
        ._setInterestRateModel(bToken.address, newModel.address);

      expect(await bToken.interestRateModel()).to.be.equal(newModel.address);
    });
  });

  describe("_setCollateralCap()", () => {
    const cap = etherMantissa(100);

    let bCollateralCapErc20;

    beforeEach(async () => {
      bCollateralCapErc20 = await makeBToken({
        kind: "bcollateralcap",
        admin: bTokenAdmin,
      });
      bToken = await makeBToken({ admin: bTokenAdmin });
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._setCollateralCap(bCollateralCapErc20.address, cap)
      ).to.be.revertedWith("only the admin may call this function");

      expect(await bCollateralCapErc20.collateralCap()).to.be.equal(0);
    });

    it("should fail for not CCollateralCapErc20 token", async () => {
      await expect(
        bTokenAdmin.connect(admin)._setCollateralCap(bToken.address, cap)
      ).to.be.revertedWithoutReason();
    });

    it("should succeed and set new collateral cap", async () => {
      await bTokenAdmin
        .connect(admin)
        ._setCollateralCap(bCollateralCapErc20.address, cap);

      expect(await bCollateralCapErc20.collateralCap()).to.be.equal(cap);
    });
  });

  describe("_queuePendingImplementation()", () => {
    let oldImplementation;
    let cCapableDelegate;

    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
      oldImplementation = await bToken.implementation();
      const BCapableErc20Delegate = await ethers.getContractFactory(
        CONTRACT_NAMES.BCAPABLE_ERC20_DELEGATE
      );
      bCapableDelegate = await BCapableErc20Delegate.deploy();
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._queuePendingImplementation(bToken.address, bCapableDelegate.address)
      ).to.be.revertedWith("only the admin may call this function");
    });

    it("should succeed and queue new implementation", async () => {
      await bTokenAdmin.setBlockTimestamp(100);

      await bTokenAdmin
        .connect(admin)
        ._queuePendingImplementation(bToken.address, bCapableDelegate.address);

      expect(
        await bTokenAdmin.implementationQueue(
          bToken.address,
          bCapableDelegate.address
        )
      ).to.be.equal("172900"); // 100 + 86400

      await expect(
        bTokenAdmin
          .connect(admin)
          ._queuePendingImplementation(bToken.address, bCapableDelegate.address)
      ).to.be.revertedWith("already in queue");

      expect(await bToken.implementation()).to.be.equal(oldImplementation);
    });
  });

  describe("_clearPendingImplementation()", () => {
    let oldImplementation;
    let bCapableDelegate;

    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
      oldImplementation = await bToken.implementation();
      const BCapableErc20Delegate = await ethers.getContractFactory(
        CONTRACT_NAMES.BCAPABLE_ERC20_DELEGATE
      );
      bCapableDelegate = await BCapableErc20Delegate.deploy();
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._clearPendingImplementation(bToken.address, bCapableDelegate.address)
      ).to.be.revertedWith("only the admin may call this function");
    });

    it("should succeed and clear new implementation", async () => {
      await bTokenAdmin.setBlockTimestamp(100);

      await bTokenAdmin
        .connect(admin)
        ._clearPendingImplementation(bToken.address, bCapableDelegate.address);

      expect(
        await bTokenAdmin.implementationQueue(
          bToken.address,
          bCapableDelegate.address
        )
      ).to.be.equal("0");

      expect(await bToken.implementation()).to.be.equal(oldImplementation);
    });
  });

  describe("_togglePendingImplementation()", () => {
    let oldImplementation;
    let bCapableDelegate;

    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
      oldImplementation = await bToken.implementation();
      const BCapableErc20Delegate = await ethers.getContractFactory(
        CONTRACT_NAMES.BCAPABLE_ERC20_DELEGATE
      );
      bCapableDelegate = await BCapableErc20Delegate.deploy();
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin
          .connect(others)
          ._togglePendingImplementation(
            bToken.address,
            bCapableDelegate.address,
            true,
            "0x00"
          )
      ).to.be.revertedWith("only the admin may call this function");

      expect(await bToken.implementation()).to.be.equal(oldImplementation);
    });

    it("cannot be toggled if not in queue", async () => {
      await expect(
        bTokenAdmin
          .connect(admin)
          ._togglePendingImplementation(
            bToken.address,
            bCapableDelegate.address,
            true,
            "0x00"
          )
      ).to.be.revertedWith("not in queue");

      expect(await bToken.implementation()).to.be.equal(oldImplementation);
    });

    it("cannot be toggled if queue not expired", async () => {
      await bTokenAdmin.setBlockTimestamp(100);

      await bTokenAdmin
        .connect(admin)
        ._queuePendingImplementation(bToken.address, bCapableDelegate.address);

      expect(
        await bTokenAdmin.implementationQueue(
          bToken.address,
          bCapableDelegate.address
        )
      ).to.be.equal("172900"); // 100 + 86400

      await bTokenAdmin.setBlockTimestamp(86499);

      await expect(
        bTokenAdmin
          .connect(admin)
          ._togglePendingImplementation(
            bToken.address,
            bCapableDelegate.address,
            true,
            "0x00"
          )
      ).to.be.revertedWith("queue not expired");

      expect(await bToken.implementation()).to.be.equal(oldImplementation);
    });

    it("should succeed and set new implementation", async () => {
      await bTokenAdmin.setBlockTimestamp(100);

      await bTokenAdmin
        .connect(admin)
        ._queuePendingImplementation(bToken.address, bCapableDelegate.address);

      expect(
        await bTokenAdmin.implementationQueue(
          bToken.address,
          bCapableDelegate.address
        )
      ).to.be.equal("172900"); // 100 + 86400

      await bTokenAdmin.setBlockTimestamp(172900);

      await bTokenAdmin
        .connect(admin)
        ._togglePendingImplementation(
          bToken.address,
          bCapableDelegate.address,
          true,
          "0x00"
        );

      expect(
        await bTokenAdmin.implementationQueue(
          bToken.address,
          bCapableDelegate.address
        )
      ).to.be.equal("0");

      expect(await bToken.implementation()).to.be.equal(
        bCapableDelegate.address
      );
    });
  });

  describe("extractReserves()", () => {
    const reserves = etherUnsigned((3e12).toFixed().toString());
    const cash = etherUnsigned(reserves.mul(2));
    const reduction = etherUnsigned((2e12).toFixed().toString());

    let interestRateModel, underlying;

    beforeEach(async () => {
      bToken = await makeBToken({ admin: bTokenAdmin });
      const interestRateModelAddr = await bToken.interestRateModel();
      interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(false);
      await bToken.harnessSetTotalReserves(reserves);
      const underlyingAddr = await bToken.underlying();
      underlying = await ethers.getContractAt(
        CONTRACT_NAMES.WETH9,
        underlyingAddr
      );
      await underlying.harnessSetBalance(bToken.address, cash);
      await bTokenAdmin
        .connect(admin)
        .setReserveManager(reserveManager.address);
    });

    it("should only be callable by reserve manager", async () => {
      await expect(
        bTokenAdmin.extractReserves(bToken.address, reduction)
      ).to.be.revertedWith("only the reserve manager may call this function");

      expect(await underlying.balanceOf(reserveManager.address)).to.be.equal(0);
    });

    it("should succeed and extract reserves", async () => {
      await bTokenAdmin
        .connect(reserveManager)
        .extractReserves(bToken.address, reduction);

      expect(await underlying.balanceOf(reserveManager.address)).to.be.equal(
        reduction
      );
    });
  });

  describe("seize()", () => {
    const amount = 1000;

    let erc20, nonStandardErc20;

    beforeEach(async () => {
      erc20 = await makeToken();
      nonStandardErc20 = await makeToken({ kind: "nonstandard" });
      await erc20.transfer(bTokenAdmin.address, amount);
      await nonStandardErc20.transfer(bTokenAdmin.address, amount);
    });

    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin.connect(others).seize(erc20.address)
      ).to.be.revertedWith("only the admin may call this function");

      expect(await erc20.balanceOf(bTokenAdmin.address)).to.be.equal(amount);
      expect(await erc20.balanceOf(admin.address)).to.be.equal(0);
    });

    it("should succeed and seize tokens", async () => {
      await bTokenAdmin.connect(admin).seize(erc20.address);

      expect(await erc20.balanceOf(bTokenAdmin.address)).to.be.equal(0);
      expect(await erc20.balanceOf(admin.address)).to.be.equal(amount);
    });

    it("should succeed and seize non-standard tokens", async () => {
      await bTokenAdmin.connect(admin).seize(nonStandardErc20.address);

      expect(await nonStandardErc20.balanceOf(bTokenAdmin.address)).to.be.equal(
        0
      );
      expect(await nonStandardErc20.balanceOf(admin.address)).to.be.equal(
        amount
      );
    });
  });

  describe("setAdmin()", () => {
    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin.connect(others).setAdmin(others.address)
      ).to.be.revertedWith("only the admin may call this function");

      expect(await bTokenAdmin.admin()).to.be.equal(admin.address);
    });

    it("cannot set admin to zero address", async () => {
      await expect(
        bTokenAdmin.connect(admin).setAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith("new admin cannot be zero address");

      expect(await bTokenAdmin.admin()).to.be.equal(admin.address);
    });

    it("should succeed and set new admin", async () => {
      await bTokenAdmin.connect(admin).setAdmin(others.address);

      expect(await bTokenAdmin.admin()).to.be.equal(others.address);
    });
  });

  describe("setReserveManager()", () => {
    it("should only be callable by admin", async () => {
      await expect(
        bTokenAdmin.connect(others).setReserveManager(reserveManager.address)
      ).to.be.revertedWith("only the admin may call this function");

      expect(await bTokenAdmin.reserveManager()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should succeed and set new reserve manager", async () => {
      await bTokenAdmin
        .connect(admin)
        .setReserveManager(reserveManager.address);

      expect(await bTokenAdmin.reserveManager()).to.be.equal(
        reserveManager.address
      );
    });
  });
});
