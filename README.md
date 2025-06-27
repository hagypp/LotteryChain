# 🎰 LotteryChain

**A decentralized, transparent, and secure lottery platform built on Ethereum.**

---

## 🚀 Overview

LotteryChain bridges **traditional lottery systems** with **blockchain technology** to solve critical issues of transparency, fairness, and trust in existing lotteries.

Using **Ethereum smart contracts**, LotteryChain manages lottery rounds in a **fully decentralized, immutable, and auditable manner**, ensuring participants can confidently engage without relying on centralized operators.

---

## ✨ Features

✅ **Decentralized:** No central authority controls the lottery; all core operations are executed transparently on-chain.

✅ **Transparent:** All rules, rounds, and transactions are visible on the Ethereum blockchain, ensuring provable fairness.

✅ **Secure:** Uses hashed ticket submissions to prevent number guessing and implements advanced security patterns (e.g., Checks-Effects-Interactions, pull payment patterns) to prevent reentrancy and front-running attacks.

✅ **Randomness:** Integrates off-chain randomness generation via AWS Lambda to overcome on-chain deterministic limitations while maintaining verifiability.

✅ **User-Friendly:** Designed for both crypto enthusiasts and traditional lottery players, offering a seamless Web3-based ticket purchase and prize management system.

✅ **Early Bird Reward Mechanism:** Incentivizes early participation to boost engagement and adoption.

---

## 📊 Why LotteryChain?

🎯 The **global lottery market** is massive, yet plagued by **opacity and trust issues**.  
🎯 Blockchain and crypto adoption continue to grow, creating demand for **provably fair gaming systems**.  
🎯 LotteryChain leverages this intersection, offering a **modern lottery experience** to potentially millions of users.

---

## 🛠️ Tech Stack

- **Smart Contracts:** Solidity, deployed on Ethereum
- **Frontend:** React (Web3.js & Ethers.js integration)
- **Randomness Generation:** AWS Lambda with secure hash verification
- **Testing:** Brownie + Pytest, including advanced security and gas stress tests

---

## 🧪 Testing

We have implemented **extensive unit, integration, and security tests**, covering:

✅ Normal ticket purchase and prize claiming  
✅ Reentrancy attacks  
✅ Front-running scenarios  
✅ Gas limit edge cases  
✅ Refund rejection and pull payment safety  
✅ Multi-round integrity and consistency checks

---

## 🪙 Getting Started

### Prerequisites (Local Setup)

- Node.js (>= 18)
- Python (>= 3.10)
- Brownie
- MetaMask
- An Ethereum provider (Hardhat)

### Installation

```bash
git clone https://github.com/hagypp/LotteryChain.git
cd LotteryChain

# Install frontend dependencies
cd frontend
npm install
```

### Run

```bash
# In a separate terminal, run a local Hardhat node:
npx hardhat node

# Deploy the contract to the local network:
npx hardhat run scripts/deploy.js --network localhost

# Start the frontend:
npm start 
```

### 🐳 Running with Docker

If you prefer an **easy, consistent setup using Docker Compose**:

```bash
git clone https://github.com/hagypp/LotteryChain.git
cd LotteryChain

docker-compose up --build
```
This will:  
✅ Spin up a local Ethereum node (Hardhat)  
✅ Deploy your LotteryChain contract automatically  
✅ Launch the frontend on http://localhost:3000  

### One-Command Run

If you prefer **running everything locally without Docker**, you can use the included script:

```bash
  node start-all.js
```
This will:  
✅ Launch your Hardhat local node  
✅ Deploy contracts automatically  
✅ Start your frontend on http://localhost:3000  

