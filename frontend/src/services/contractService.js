// src/services/contractService.js
import Web3 from 'web3';

// Import the contract details from your existing app.js
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "drawLotteryWinner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getActiveTickets",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getContractBalance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTicketPrice",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTotalRegisteredPlayers",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTotalTicketsSold",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "purchaseTicket",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "registerPlayer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "startNewLotteryRound",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

class ContractService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
    }

    async init() {
        if (window.ethereum) {
            try {
                this.web3 = new Web3(window.ethereum);
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.account = accounts[0];
                this.contract = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
                return true;
            } catch (error) {
                console.error("Failed to initialize contract service:", error);
                throw error;
            }
        } else {
            throw new Error("MetaMask is not installed");
        }
    }

    async getTicketPrice() {
        try {
            const price = await this.contract.methods.getTicketPrice().call();
            return this.web3.utils.fromWei(price, 'ether');
        } catch (error) {
            console.error("Failed to get ticket price:", error);
            throw error;
        }
    }

    async purchaseTicket() {
        try {
            const price = await this.contract.methods.getTicketPrice().call();
            const result = await this.contract.methods.purchaseTicket().send({
                from: this.account,
                value: price
            });
            return result;
        } catch (error) {
            console.error("Failed to purchase ticket:", error);
            throw error;
        }
    }

    async getActiveTickets() {
        try {
            const tickets = await this.contract.methods.getActiveTickets().call({
                from: this.account
            });
            return tickets;
        } catch (error) {
            console.error("Failed to get active tickets:", error);
            throw error;
        }
    }

    async getContractBalance() {
        try {
            const balance = await this.contract.methods.getContractBalance().call();
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error("Failed to get contract balance:", error);
            throw error;
        }
    }

    async registerPlayer() {
        try {
            const result = await this.contract.methods.registerPlayer().send({
                from: this.account
            });
            return result;
        } catch (error) {
            console.error("Failed to register player:", error);
            throw error;
        }
    }

    async getTotalPlayers() {
        try {
            const total = await this.contract.methods.getTotalRegisteredPlayers().call();
            return total;
        } catch (error) {
            console.error("Failed to get total players:", error);
            throw error;
        }
    }

    async getTotalTickets() {
        try {
            const total = await this.contract.methods.getTotalTicketsSold().call();
            return total;
        } catch (error) {
            console.error("Failed to get total tickets:", error);
            throw error;
        }
    }

    async drawWinner() {
        try {
            const result = await this.contract.methods.drawLotteryWinner().send({
                from: this.account
            });
            return result;
        } catch (error) {
            console.error("Failed to draw winner:", error);
            throw error;
        }
    }
}

const contractService = new ContractService();
export default contractService;