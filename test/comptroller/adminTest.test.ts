import { ethers } from "hardhat";
import { CONTRACT_NAMES } from "../../constants";
import { Unitroller } from "../../typechain-types";

describe("admin / _setPendingAdmin / _acceptAdmin", () => {
  let root, accounts;
  let comptroller;
  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    const Comptroller = await ethers.getContractFactory(
      CONTRACT_NAMES.UNITROLLER
    );
    let comptroller = <Unitroller>await Comptroller.connect(root).deploy();
    await comptroller.deployed();
  });

  // describe('admin()')
});
