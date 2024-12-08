const hre = require("hardhat");

async function main() {
  const MainTicketSystem = await hre.ethers.getContractFactory("MainTicketSystem");
  
  // Deploy the contract
  const ticketSystem = await MainTicketSystem.deploy();
  
  // Wait for the contract to be mined and deployed
  await ticketSystem.waitForDeployment();
  
  // Get the address of the deployed contract
  const address = await ticketSystem.getAddress();
  
  console.log(
    `MainTicketSystem deployed to ${address}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });