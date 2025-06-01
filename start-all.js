const { spawn } = require('child_process');

// Start Hardhat node
const hardhatNode = spawn('npx hardhat node', {
  stdio: 'inherit',
  shell: true,
});

// Wait for node to start
setTimeout(() => {
  // Run deploy script
  const deployScript = spawn('npx hardhat run scripts/deploy.js --network localhost', {
    stdio: 'inherit',
    shell: true,
  });

  deployScript.on('close', (code) => {
    if (code === 0) {
      // Start the frontend
      const npmStart = spawn('npm start', {
        stdio: 'inherit',
        shell: true,
      });
    } else {
      console.error(`Deploy script failed with code ${code}`);
    }
  });
}, 5000);