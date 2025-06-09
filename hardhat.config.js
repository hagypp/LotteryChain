require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200, // Balance size and deployment cost
    },
  },
  networks: {
  localhost: {
    url: process.env.HARDHAT_NODE_URL || "http://127.0.0.1:8545",
  },
  }
  // networks: {
  //   hardhat: {
  //     gas: 12000000, // Ensure sufficient block gas limit
  //     gasPrice: 1000000000, // 1 gwei
  //     initialBaseFeePerGas: 0, // Avoid EIP-1559 issues
  //   },
  // },
};
