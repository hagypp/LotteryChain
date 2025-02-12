from web3 import Web3
from solcx import compile_standard, install_solc
import json
import os

def compile_and_deploy():
    # Install specific solc version
    install_solc('0.8.19')
    
    # Read contract files
    with open('contracts/MainTicketSystem.sol', 'r') as file:
        main_ticket_source = file.read()
    
    with open('contracts/PlayerRegistry.sol', 'r') as file:
        player_registry_source = file.read()
        
    with open('contracts/TicketManager.sol', 'r') as file:
        ticket_manager_source = file.read()
        
    with open('contracts/LotteryManager.sol', 'r') as file:
        lottery_manager_source = file.read()

    # Compile contracts
    compiled_sol = compile_standard(
        {
            "language": "Solidity",
            "sources": {
                "MainTicketSystem.sol": {"content": main_ticket_source},
                "PlayerRegistry.sol": {"content": player_registry_source},
                "TicketManager.sol": {"content": ticket_manager_source},
                "LotteryManager.sol": {"content": lottery_manager_source}
            },
            "settings": {
                "outputSelection": {
                    "*": {
                        "*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
                    }
                }
            },
        },
        solc_version="0.8.19"
    )

    # Connect to local Hardhat node
    w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
    
    # Get contract data
    contract_data = compiled_sol['contracts']['MainTicketSystem.sol']['MainTicketSystem']
    abi = contract_data['abi']
    bytecode = contract_data['evm']['bytecode']['object']
    
    # Deploy contract
    Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    account = w3.eth.accounts[0]
    
    # Deploy MainTicketSystem
    tx_hash = Contract.constructor().transact({
        'from': account,
        'gas': 6000000  # Increased gas limit for complex deployment
    })
    
    # Wait for transaction receipt
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    print(f"Contract deployed to: {tx_receipt.contractAddress}")
    
    # Save contract data
    contract_info = {
        'address': tx_receipt.contractAddress,
        'abi': abi
    }
    
    with open('contract_data.json', 'w') as f:
        json.dump(contract_info, f)
    
    return tx_receipt.contractAddress, abi

if __name__ == "__main__":
    address, abi = compile_and_deploy()
