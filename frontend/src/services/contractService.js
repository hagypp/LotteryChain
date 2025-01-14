// Updated contractService.js
import Web3 from 'web3';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRACT_ABI = [
    {
        "inputs": [],
        "name": "registerPlayer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_player",
                "type": "address"
            }
        ],
        "name": "isPlayerRegistered",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
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
        "name": "getAllRegisteredPlayers",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
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
                
                window.ethereum.on('accountsChanged', (accounts) => {
                    this.account = accounts[0];
                    window.location.reload();
                });

                return true;
            } catch (error) {
                throw new Error(`Initialization failed: ${error.message}`);
            }
        } else {
            throw new Error("MetaMask is not installed");
        }
    }

    async getContractBalance() {
        try {
            const balance = await this.web3.eth.getBalance(CONTRACT_ADDRESS);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            throw new Error(`Error fetching contract balance: ${error.message}`);
        }
    }

    async getTicketPrice() {
        try {
            const price = await this.contract.methods.getTicketPrice().call();
            return this.web3.utils.fromWei(price.toString(), 'ether');
        } catch (error) {
            throw new Error(`Error fetching ticket price: ${error.message}`);
        }
    }

    async getTotalRegisteredPlayers() {
        try {
            const totalPlayers = await this.contract.methods.getTotalRegisteredPlayers().call();
            return totalPlayers;
        } catch (error) {
            throw new Error(`Error fetching total registered players: ${error.message}`);
        }
    }

    async getAllRegisteredPlayers() {
        try {
            const players = await this.contract.methods.getAllRegisteredPlayers().call();
            return players;
        } catch (error) {
            throw new Error(`Error fetching all registered players: ${error.message}`);
        }
    }

    async registerPlayer() {
        try {
            await this.contract.methods.registerPlayer().send({ from: this.account });
            return { success: true };
        } catch (error) {
            throw new Error(`Error registering player: ${error.message}`);
        }
    }

    async isPlayerRegistered(playerAddress) {
        try {
            const isRegistered = await this.contract.methods.isPlayerRegistered(playerAddress).call();
            return isRegistered;
        } catch (error) {
            throw new Error(`Error checking player registration: ${error.message}`);
        }
    }

    async purchaseTicket() {
        try {
            const isRegistered = await this.isPlayerRegistered(this.account);
            if (!isRegistered) {
                throw new Error("Player is not registered. Please register first.");
            }
    
            const ticketPrice = await this.contract.methods.getTicketPrice().call();
            await this.contract.methods.purchaseTicket().send({
                from: this.account,
                value: ticketPrice
            });
    
            return { success: true };
        } catch (error) {
            throw new Error(`Ticket purchase failed: ${error.message}`);
        }
    }
}

const contractService = new ContractService();
export default contractService;
