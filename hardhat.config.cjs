require("@nomicfoundation/hardhat-toolbox");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");
// Use Hardhat's locally installed solc-js so the mandatory local demo can build offline.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async ({ solcVersion }, _hre, runSuper) => {
  if (solcVersion === "0.8.26") return { compilerPath: require.resolve("solc/soljson.js"), isSolcJs: true, version: solcVersion, longVersion: require("solc").version() };
  return runSuper();
});
module.exports = {
  solidity: "0.8.26",
  networks: { localhost: { url: process.env.RPC_URL || "http://127.0.0.1:8545", chainId: 31337 } },
  paths: { sources: "./contracts", tests: "./test/contracts", cache: "./.hardhat-cache", artifacts: "./artifacts" }
};
