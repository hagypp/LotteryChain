// Updated contractService.js
import Web3 from 'web3';
import ABI from '../contracts/contractABI.json';
//import CONTRACT_ADDRESS from '../contracts/contractConfig'; 

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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

                this.contract = new this.web3.eth.Contract(ABI, CONTRACT_ADDRESS);

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

    async isLotteryActive() {
        try {
            const isActive = await this.contract.methods.isLotteryActive().call();
            return isActive;
        } catch (error) {
            throw new Error(`Error checking if lottery is active: ${error.message}`);
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

    async purchaseTicket() {
        try {
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

    async getOwner() {
        try {
            const owner = await this.contract.methods.getOwner().call();
            return owner;
        } catch (error) {
            throw new Error(`Error fetching contract owner: ${error.message}`);
        }
    }

    async getActiveTickets() {
        try {
            const tickets = await this.contract.methods.getActiveTickets().call({ from: this.account });
            return tickets;
        } catch (error) {
            throw new Error(`Error fetching active tickets: ${error.message}`);
        }
    }

    async startNewLotteryRound() {
        try {
            await this.contract.methods.startNewLotteryRound().send({ from: this.account });
            return { success: true };
        } catch (error) {
            throw new Error(`Error starting a new lottery round: ${error.message}`);
        }
    }

    async selectTicketsForLottery(ticketId , ticketHash , ticketHashWithStrong ) {
        try {
            // Convert the first ticket ID to a string to handle BigInt
            ticketHash = "0x" + ticketHash;
            ticketHashWithStrong = "0x" + ticketHashWithStrong;
            await this.contract.methods.selectTicketsForLottery(ticketId, ticketHash ,ticketHashWithStrong).send({ from: this.account });
            return { success: true };
        } catch (error) {
            throw new Error(`Error selecting tickets for lottery: ${error.message}`);
        }
    }

    async drawLotteryWinner() {
        try {
            const result = await this.contract.methods.drawLotteryWinner().send({ from: this.account });
            return { success: true, result };
        } catch (error) {
            throw new Error(`Error drawing lottery winner: ${error.message}`);
        }
    }

    async setTicketPrice(newPrice) {
        try {
            const weiPrice = this.web3.utils.toWei(newPrice.toString(), 'ether');
            await this.contract.methods.setTicketPrice(weiPrice).send({ from: this.account });
            return { success: true };
        } catch (error) {
            throw new Error(`Error setting ticket price: ${error.message}`);
        }
    }

    async getAllLotteryRoundsInfo() {
        try {
            const result = await this.contract.methods.getAllLotteryRoundsInfo().call();
    
            const formattedResult = result.roundNumbers.map((_, i) => ({
                roundNumber: result.roundNumbers[i],
                totalPrizePool: result.totalPrizePools[i],
                participants: result.participantsList[i],
                winner: result.winners[i],
                isFinalized: result.finalizedStatuses[i]
            }));
    
            return formattedResult;
        } catch (error) {
            throw new Error(`Error fetching lottery rounds: ${error.message}`);
        }
    }
    
    async getPlayerTickets(playerAddress) {
        try {
            const tickets = await this.contract.methods.getPlayerTickets(playerAddress).call();
            return tickets; 
        } catch (error) {
            throw new Error(`Failed to get player tickets: ${error.message}`);
        }
    }    

}

const contractService = new ContractService();
export default contractService;