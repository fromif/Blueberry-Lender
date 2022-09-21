const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");

describe("CompScenario", () => {
  let root, accounts;
  let comp;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();

    const CompScenario = await ethers.getContractFactory(
      CONTRACT_NAMES.COMP_SCENARIO
    );
    comp = await CompScenario.deploy(root.address);
  });

  describe("lookup curve", () => {
    [
      [1, 3],
      [2, 5],
      [20, 8],
      [100, 10],
      [500, 12],
      ...(process.env["SLOW"]
        ? [
            [5000, 16],
            [20000, 18],
          ]
        : []),
    ].forEach(([checkpoints, expectedReads]) => {
      it(`with ${checkpoints} checkpoints, has ${expectedReads} reads`, async () => {
        let remaining = checkpoints;
        let offset = 0;
        while (remaining > 0) {
          let amt = remaining > 1000 ? 1000 : remaining;
          await comp.connect(root).generateCheckpoints(amt, offset);
          remaining -= amt;
          offset += amt;
        }

        let result = await comp.getPriorVotes(root.address, 1);

        console.log(result);
        console.log(expectedReads);
        // await saddle.trace(result, {
        //   constants: {
        //     account: root,
        //   },
        //   preFilter: ({ op }) => op === "SLOAD",
        //   postFilter: ({ source }) =>
        //     !source || !source.includes("mockBlockNumber"),
        //   execLog: (log) => {
        //     if (process.env["VERBOSE"]) {
        //       log.show();
        //     }
        //   },
        //   exec: (logs, info) => {
        //     expect(logs.length).toEqual(expectedReads);
        //   },
        // });
      }, 600000);
    });
  });
});
