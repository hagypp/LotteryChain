// Contract details
const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const contractABI = [
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

let web3;
let contract;

// Connect Wallet
document.getElementById("connectWallet").addEventListener("click", async () => {
    if (window.ethereum) {
        try {
            await ethereum.request({ method: "eth_requestAccounts" });
            web3 = new Web3(window.ethereum);
            contract = new web3.eth.Contract(contractABI, contractAddress);
            alert("Wallet connected successfully!");
        } catch (error) {
            console.error(error);
            alert("Error connecting wallet.");
        }
    } else {
        alert("MetaMask not detected. Please install MetaMask!");
    }
});

// Register Player
document.getElementById("registerPlayer").addEventListener("click", async () => {
    const accounts = await web3.eth.getAccounts();
    try {
        await contract.methods.registerPlayer().send({ from: accounts[0] });
        alert("Player registered successfully!");
    } catch (error) {
        console.error(error);
        alert("Failed to register player.");
    }
});

// Purchase Ticket
document.getElementById("purchaseTicket").addEventListener("click", async () => {
    const accounts = await web3.eth.getAccounts();
    const ticketPrice = web3.utils.toWei(
        document.getElementById("ticketPrice").value,
        "ether"
    );
    try {
        await contract.methods.purchaseTicket().send({
            from: accounts[0],
            value: ticketPrice,
        });
        alert("Ticket purchased successfully!");
    } catch (error) {
        console.error(error);
        alert("Failed to purchase ticket.");
    }
});

// Get Contract Balance
document.getElementById("getBalance").addEventListener("click", async () => {
    try {
        const balance = await contract.methods.getContractBalance().call();
        document.getElementById("balanceResult").innerText =
            "Contract Balance: " + web3.utils.fromWei(balance, "ether") + " ETH";
    } catch (error) {
        console.error(error);
        alert("Failed to fetch contract balance.");
    }
});

// Draw Lottery Winner
document.getElementById("drawWinner").addEventListener("click", async () => {
    const accounts = await web3.eth.getAccounts();
    try {
        const winner = await contract.methods.drawLotteryWinner().send({ from: accounts[0] });
        document.getElementById("result").innerText = `Winner Address: ${winner.events.WinnerAddress.returnValues[0]}`;
    } catch (error) {
        console.error(error);
        alert("Failed to draw a winner.");
    }
});
