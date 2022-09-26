const { expect } = require("chai");
const {
  ethers,
  testUtils: { block },
  web3,
} = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const EIP712 = require("../Utils/eip712");
const { unlockedAccount, minerStop, minerStart } = require("../utils/ethereum");

describe("Comp", () => {
  const name = "Blueberry";
  const symbol = "BLB";

  let root, a1, a2, accounts, chainId;
  let comp;

  beforeEach(async () => {
    [root, a1, a2, ...accounts] = await ethers.getSigners();
    chainId = await web3.eth.net.getId(); // See: https://github.com/trufflesuite/ganache-core/issues/515
    const Comp = await ethers.getContractFactory(CONTRACT_NAMES.COMP);
    comp = await Comp.deploy(root.address);
  });

  describe("metadata", () => {
    it("has given name", async () => {
      expect(await comp.name()).to.be.equal(name);
    });

    it("has given symbol", async () => {
      expect(await comp.symbol()).to.be.equal(symbol);
    });
  });

  describe("balanceOf", () => {
    it("grants to initial account", async () => {
      expect(await comp.balanceOf(root.address)).to.be.equal(
        "9000000000000000000000000"
      );
    });
  });

  describe("delegateBySig", () => {
    const Domain = (comp) => ({
      name,
      chainId,
      verifyingContract: comp.address,
    });
    const Types = {
      Delegation: [
        { name: "delegatee", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
      ],
    };

    it("reverts if the signatory is invalid", async () => {
      const delegatee = root.address,
        nonce = 0,
        expiry = 0;
      await expect(
        comp.delegateBySig(
          delegatee,
          nonce,
          expiry,
          0,
          "0x0000000000000000000000000000000000000000000000000000000000000bad",
          "0x0000000000000000000000000000000000000000000000000000000000000bad"
        )
      ).to.be.revertedWith("Comp::delegateBySig: invalid signature");
    });

    it("reverts if the nonce is bad ", async () => {
      const delegatee = root.address,
        nonce = 1,
        expiry = 0;
      const { v, r, s } = EIP712.sign(
        Domain(comp),
        "Delegation",
        { delegatee, nonce, expiry },
        Types,
        unlockedAccount().privateKey
      );
      await expect(
        comp.delegateBySig(delegatee, nonce, expiry, v, r, s)
      ).to.be.revertedWith("Comp::delegateBySig: invalid nonce");
    });

    it("reverts if the signature has expired", async () => {
      const delegatee = root.address,
        nonce = 0,
        expiry = 0;
      const { v, r, s } = EIP712.sign(
        Domain(comp),
        "Delegation",
        { delegatee, nonce, expiry },
        Types,
        unlockedAccount().privateKey
      );
      await expect(
        comp.delegateBySig(delegatee, nonce, expiry, v, r, s)
      ).to.be.revertedWith("Comp::delegateBySig: signature expired");
    });

    it("delegates on behalf of the signatory", async () => {
      const delegatee = root.address,
        nonce = 0,
        expiry = 10e9;
      const account = unlockedAccount();
      const { v, r, s } = EIP712.sign(
        Domain(comp),
        "Delegation",
        { delegatee, nonce, expiry },
        Types,
        account.privateKey
      );
      expect(await comp.delegates(account.address)).to.be.equal(
        ethers.constants.AddressZero
      );
      const tx = await comp.delegateBySig(delegatee, nonce, expiry, v, r, s);
      expect(tx.gasUsed < 80000);
      expect(await comp.delegates(account.address)).to.be.equal(root.address);
    });
  });

  describe("numCheckpoints", () => {
    it("returns the number of checkpoints for a delegate", async () => {
      let guy = accounts[0];
      await comp.transfer(guy.address, "100"); //give an account a few tokens for readability
      expect(await comp.numCheckpoints(a1.address)).to.be.equal(0);

      const t1 = await comp.connect(guy).delegate(a1.address);
      expect(await comp.numCheckpoints(a1.address)).to.be.equal(1);

      const t2 = await comp.connect(guy).transfer(a2.address, 10);
      expect(await comp.numCheckpoints(a1.address)).to.be.equal(2);

      const t3 = await comp.connect(guy).transfer(a2.address, 10);
      expect(await comp.numCheckpoints(a1.address)).to.be.equal(3);

      const t4 = await comp.connect(root).transfer(guy.address, 20);
      expect(await comp.numCheckpoints(a1.address)).to.be.equal(4);

      const checkPt1 = await comp.checkpoints(a1.address, 0);
      expect(checkPt1.fromBlock).to.be.equal(t1.blockNumber);
      expect(checkPt1.votes).to.be.equal(100);

      const checkPt2 = await comp.checkpoints(a1.address, 1);
      expect(checkPt2.fromBlock).to.be.equal(t2.blockNumber);
      expect(checkPt2.votes).to.be.equal(90);

      const checkPt3 = await comp.checkpoints(a1.address, 2);
      expect(checkPt3.fromBlock).to.be.equal(t3.blockNumber);
      expect(checkPt3.votes).to.be.equal(80);

      const checkPt4 = await comp.checkpoints(a1.address, 3);
      expect(checkPt4.fromBlock).to.be.equal(t4.blockNumber);
      expect(checkPt4.votes).to.be.equal(100);
    });

    // it("does not add more than one checkpoint in a block", async () => {
    //   let guy = accounts[0];

    //   await comp.transfer(guy.address, "100"); //give an account a few tokens for readability
    //   expect(await comp.numCheckpoints(a1.address)).to.be.equal(0);

    //   await minerStop();

    //   let t1 = comp.connect(guy).delegate(a1.address);
    //   let t2 = comp.connect(guy).transfer(a2.address, 10);
    //   let t3 = comp.connect(guy).transfer(a2.address, 10, { gas: 1000000 });

    //   await minerStart();
    //   const t = await web3.currentProvider.send("evm_setAutomine", [true]);

    //   t1 = await t1;
    //   t2 = await t2;
    //   t3 = await t3;

    //   expect(await comp.numCheckpoints(a1.address)).to.be.equal(1);

    //   const checkPt1 = await comp.checkpoints(a1.address, 0);
    //   expect(checkPt1.fromBlock).to.be.equal(t1.blockNumber);
    //   expect(checkPt1.votes).to.be.equal(100);

    //   const checkPt2 = await comp.checkpoints(a1.address, 1);
    //   expect(checkPt2.fromBlock).to.be.equal(0);
    //   expect(checkPt2.votes).to.be.equal(0);

    //   const checkPt3 = await comp.checkpoints(a1.address, 2);
    //   expect(checkPt3.fromBlock).to.be.equal(0);
    //   expect(checkPt3.votes).to.be.equal(0);

    //   const t4 = await comp.transfer(guy.address, 20);
    //   const checkPt4 = await comp.numCheckpoints(al.address).to.be.equal(2);

    //   expect(checkPt4.fromBlock).to.be.equal(t4.blockNumber.toString());
    //   expect(checkPt4.votes).to.be.equal(100);
    // });
  });

  describe("getPriorVotes", () => {
    it("reverts if block number >= current block", async () => {
      await expect(
        comp.getPriorVotes(
          a1.address,
          (5e10).toLocaleString("fullwide", {
            useGrouping: false,
          })
        )
      ).to.be.revertedWith("Comp::getPriorVotes: not yet determined");
    });

    it("returns 0 if there are no checkpoints", async () => {
      expect(await comp.getPriorVotes(a1.address, 0)).to.be.equal(0);
    });

    it("returns the latest block if >= last checkpoint block", async () => {
      const t1 = await comp.delegate(a1.address);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);

      expect(await comp.getPriorVotes(a1.address, t1.blockNumber)).to.be.equal(
        "9000000000000000000000000"
      );
      expect(
        await comp.getPriorVotes(a1.address, t1.blockNumber + 1)
      ).to.be.equal("9000000000000000000000000");
    });

    it("returns zero if < first checkpoint block", async () => {
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      const t1 = await comp.delegate(a1.address);

      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);

      expect(
        await comp.getPriorVotes(a1.address, t1.blockNumber - 1)
      ).to.be.equal(0);
      expect(
        await comp.getPriorVotes(a1.address, t1.blockNumber + 1)
      ).to.be.equal("9000000000000000000000000");
    });

    it("generally returns the voting balance at the appropriate checkpoint", async () => {
      const t1 = await comp.delegate(a1.address);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      const t2 = await comp.transfer(a2.address, 10);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      const t3 = await comp.transfer(a2.address, 10);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      const t4 = await comp.connect(a2).transfer(root.address, 20);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);

      expect(
        await comp.getPriorVotes(a1.address, t1.blockNumber - 1)
      ).to.be.equal(0);
      expect(await comp.getPriorVotes(a1.address, t1.blockNumber)).to.be.equal(
        "9000000000000000000000000"
      );
      expect(
        await comp.getPriorVotes(a1.address, t1.blockNumber + 1)
      ).to.be.equal("9000000000000000000000000");
      expect(await comp.getPriorVotes(a1.address, t2.blockNumber)).to.be.equal(
        "8999999999999999999999990"
      );
      expect(
        await comp.getPriorVotes(a1.address, t2.blockNumber + 1)
      ).to.be.equal("8999999999999999999999990");
      expect(await comp.getPriorVotes(a1.address, t3.blockNumber)).to.be.equal(
        "8999999999999999999999980"
      );
      expect(
        await comp.getPriorVotes(a1.address, t3.blockNumber + 1)
      ).to.be.equal("8999999999999999999999980");
      expect(await comp.getPriorVotes(a1.address, t4.blockNumber)).to.be.equal(
        "9000000000000000000000000"
      );
      expect(
        await comp.getPriorVotes(a1.address, t4.blockNumber + 1)
      ).to.be.equal("9000000000000000000000000");
    });
  });
});
