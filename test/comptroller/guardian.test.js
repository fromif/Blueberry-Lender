const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { makeComptroller, makeBToken } = require("../utils/compound");

describe("Comptroller", () => {
  let comptroller, cToken;
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
  });

  describe("_setGuardian", () => {
    beforeEach(async () => {
      comptroller = await makeComptroller();
    });

    describe("failing", () => {
      it("emits a failure log if not sent by admin", async () => {
        await expect(
          comptroller.connect(accounts[1])._setGuardian(root.address)
        )
          .to.emit(comptroller, "Failure")
          .withArgs(1, 19, 0);
      });

      it("does not change the guardian", async () => {
        let guardian = await comptroller.guardian();
        expect(guardian).to.be.equal(ethers.constants.AddressZero);
        await comptroller.connect(accounts[1])._setGuardian(root.address);

        guardian = await comptroller.guardian();
        expect(guardian).to.be.equal(ethers.constants.AddressZero);
      });
    });

    describe("succesfully changing guardian", () => {
      let result;

      beforeEach(async () => {
        comptroller = await makeComptroller();

        result = comptroller._setGuardian(accounts[1].address);
      });

      it("emits new guardian event", async () => {
        await expect(result)
          .to.emit(comptroller, "NewGuardian")
          .withArgs(ethers.constants.AddressZero, accounts[1].address);
      });

      it("changes pending guardian", async () => {
        let guardian = await comptroller.guardian();
        expect(guardian).to.be.equal(accounts[1].address);
      });
    });
  });

  describe("setting paused", () => {
    beforeEach(async () => {
      bToken = await makeBToken({ supportMarket: true });
      comptrollerAddr = await bToken.comptroller();
      comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
    });

    let globalMethods = ["Transfer", "Seize"];
    describe("succeeding", () => {
      let guardian;
      beforeEach(async () => {
        guardian = accounts[1];
        await comptroller.connect(root)._setGuardian(accounts[1].address);
      });

      globalMethods.forEach(async (method) => {
        it(`only guardian or admin can pause ${method}`, async () => {
          await expect(
            comptroller.connect(accounts[2])[`_set${method}Paused`](true)
          ).to.be.revertedWith("guardian or admin only");
        });

        it(`Guardian can pause of ${method}GuardianPaused`, async () => {
          reply = await comptroller
            .connect(guardian)
            [`_set${method}Paused`](true);
          receipt = await reply.wait();
          expect(receipt.events[0].event).to.be.equal("ActionPaused");
          expect(receipt.events[0].args.action).to.be.equal(method);
          expect(receipt.events[0].args.pauseState).to.be.equal(true);

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);
          state = await comptroller[`${camelCase}GuardianPaused`]();
          expect(state).to.be.equal(true);

          await expect(
            comptroller.connect(guardian)[`_set${method}Paused`](false)
          ).to.be.revertedWith("admin only");

          reply = await comptroller[`_set${method}Paused`](false);
          receipt = await reply.wait();
          expect(receipt.events[0].event).to.be.equal("ActionPaused");
          expect(receipt.events[0].args.action).to.be.equal(method);
          expect(receipt.events[0].args.pauseState).to.be.equal(false);

          state = await comptroller[`${camelCase}GuardianPaused`]();
          expect(state).to.be.equal(false);
        });

        it(`pauses ${method}`, async () => {
          await comptroller.connect(guardian)[`_set${method}Paused`](true);
          switch (method) {
            case "Transfer":
              await expect(
                comptroller.transferAllowed(
                  accounts[5].address,
                  accounts[6].address,
                  accounts[7].address,
                  1
                )
              ).to.be.revertedWith(`${method.toLowerCase()} is paused`);
              break;

            case "Seize":
              await expect(
                comptroller.seizeAllowed(
                  accounts[5].address,
                  accounts[6].address,
                  accounts[7].address,
                  accounts[8].address,
                  1
                )
              ).to.be.revertedWith(`${method.toLowerCase()} is paused`);
              break;

            default:
              break;
          }
        });
      });
    });

    let marketMethods = ["Borrow", "Mint", "Flashloan"];
    describe("succeeding", () => {
      let guardian;
      beforeEach(async () => {
        guardian = accounts[1];
        await comptroller.connect(root)._setGuardian(accounts[1].address);
      });

      marketMethods.forEach(async (method) => {
        it(`only guardian or admin can pause ${method}`, async () => {
          await expect(
            comptroller
              .connect(accounts[2])
              [`_set${method}Paused`](bToken.address, true)
          ).to.be.revertedWith("guardian or admin only");
          await expect(
            comptroller
              .connect(accounts[2])
              [`_set${method}Paused`](bToken.address, false)
          ).to.be.revertedWith("guardian or admin only");
        });

        it(`Guardian can pause of ${method}GuardianPaused`, async () => {
          reply = await comptroller
            .connect(guardian)
            [`_set${method}Paused`](bToken.address, true);
          receipt = await reply.wait();
          expect(receipt.events[0].event).to.be.equal("ActionPaused");
          expect(receipt.events[0].args.bToken).to.be.equal(bToken.address);
          expect(receipt.events[0].args.action).to.be.equal(method);
          expect(receipt.events[0].args.pauseState).to.be.equal(true);

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);
          state = await comptroller[`${camelCase}GuardianPaused`](
            bToken.address
          );
          expect(state).to.be.equal(true);

          await expect(
            comptroller
              .connect(guardian)
              [`_set${method}Paused`](bToken.address, false)
          ).to.be.revertedWith("admin only");

          reply = await comptroller[`_set${method}Paused`](
            bToken.address,
            false
          );
          receipt = await reply.wait();
          expect(receipt.events[0].event).to.be.equal("ActionPaused");
          expect(receipt.events[0].args.bToken).to.be.equal(bToken.address);
          expect(receipt.events[0].args.action).to.be.equal(method);
          expect(receipt.events[0].args.pauseState).to.be.equal(false);

          state = await comptroller[`${camelCase}GuardianPaused`](
            bToken.address
          );
          expect(state).to.be.equal(false);
        });

        it(`pauses ${method}`, async () => {
          await comptroller
            .connect(guardian)
            [`_set${method}Paused`](bToken.address, true);
          switch (method) {
            case "Mint":
              await expect(
                comptroller.mintAllowed(
                  accounts[5].address,
                  accounts[6].address,
                  1
                )
              ).to.be.revertedWith("market not listed");
              await expect(
                comptroller.mintAllowed(bToken.address, accounts[6].address, 1)
              ).to.be.revertedWith(`${method.toLowerCase()} is paused`);
              break;

            case "Borrow":
              await expect(
                comptroller.borrowAllowed(
                  accounts[5].address,
                  accounts[6].address,
                  1
                )
              ).to.be.revertedWith("market not listed");
              await expect(
                comptroller.borrowAllowed(bToken.address, accounts[6].address, 1)
              ).to.be.revertedWith(`${method.toLowerCase()} is paused`);
              break;

            default:
              break;
          }
        });
      });
    });
  });
});
