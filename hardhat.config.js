require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.24",  // Match your contract's Solidity version
  networks: {
    // Local development network configuration
    localhost: {
      url: "http://127.0.0.1:8545",
      // You can add accounts if needed
    }
  }
};