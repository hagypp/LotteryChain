import pytest
from brownie import MainTicketSystem, accounts, web3, reverts, chain, Wei, exceptions, compile_source
from brownie.network import gas_price
from eth_account import Account
import hashlib


BLOCKS_TO_WAIT_fOR_CLOSE = 4; # Number of blocks to wait for lottery to close

@pytest.fixture
def main_ticket_system():
    """Fixture to deploy the MainTicketSystem contract before each test"""
    print("Deploying MainTicketSystem contract...")
    return MainTicketSystem.deploy({'from': accounts[0]})

@pytest.fixture
def malicious_contract_claimPrize(main_ticket_system, accounts):
    """Fixture to deploy a malicious contract for reentrancy attack"""
    malicious_code = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface MainTicketSystem {
    function claimPrize(address recipient) external;
}

contract Malicious {
    MainTicketSystem public ticketSystem;
    uint256 public attackCount;
    uint256 public ticketId;
    bool public acceptEther = true;
    constructor(address _ticketSystem) {
        ticketSystem = MainTicketSystem(_ticketSystem);
    }

    receive() external payable {
        if (acceptEther) 
        {
            acceptEther = false;
            return;
        }
        if (attackCount < 5) {
            attackCount++;
            ticketSystem.claimPrize(address(this));
        }
    }

    function attack() external {
        ticketSystem.claimPrize(address(this));
    }
}
"""
    compiled = compile_source(malicious_code, solc_version="0.8.2")
    Malicious = compiled['Malicious']
    # Deploy the malicious contract
    Malicious = Malicious.deploy(main_ticket_system.address, {'from': accounts[1]})
    accounts[1].transfer(Malicious,"10 ether")  # Ensure malicious contract has funds
    accounts[1].transfer(main_ticket_system, "10 ether")  # Ensure main contract has funds
    return Malicious


def test_reentrancy_attack_claimPrize(main_ticket_system, owner_account, malicious_contract_claimPrize):
    """Test for reentrancy attack in claimPrize function"""
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Normal user purchases a ticket
    tx = main_ticket_system.purchaseTicket({'from': malicious_contract_claimPrize, 'value': ticket_price})
    ticket_hash = web3.keccak(text="hash_1")
    ticket_hash_with_strong = web3.keccak(text="strong_hash_1")
    
    # Select ticket for lottery
    main_ticket_system.selectTicketsForLottery(tx.return_value, ticket_hash, ticket_hash_with_strong, {'from': malicious_contract_claimPrize})
    
    # Close lottery and draw winner
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)
    if main_ticket_system.isLotteryActive():
        main_ticket_system.closeLotteryRound({'from': owner_account})
    chain.mine(1)
    
    # Assume accounts[1] wins a prize
    main_ticket_system.drawLotteryWinner(ticket_hash, ticket_hash_with_strong, [1,2,3,4,5,6], 7, {'from': owner_account})

    round_info = main_ticket_system.getLotteryRoundInfo(1)
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, addressArrays,  status, big_prize, small_prize, mini_prize, commission, total_tickets,_,_ = round_info
    
    prize = main_ticket_system.getPendingPrize(malicious_contract_claimPrize, {'from': malicious_contract_claimPrize})
    assert prize == big_prize, "malicious_contract should have a pending prize"
    
    malicious_contract_balance_before = malicious_contract_claimPrize.balance()
    contract_balance_before = main_ticket_system.getContractBlance()
    
    # Attempt reentrancy attack
    with reverts("Prize transfer failed" and "No prize to claim"):
        tx = malicious_contract_claimPrize.attack({'from': malicious_contract_claimPrize})

    assert malicious_contract_claimPrize.balance() - malicious_contract_balance_before < Wei("0.0001 ether") , "malicious_contract balance should not change after failed reentrancy attack"
    # Verify contract balance hasn't been drained
    assert main_ticket_system.getContractBlance() == contract_balance_before
    assert main_ticket_system.getPendingPrize(malicious_contract_claimPrize, {'from': malicious_contract_claimPrize}) == prize, "Pending prize should remain unchanged after failed reentrancy attack"
    
    
@pytest.fixture  
def malicious_contract_purchaseTicket(main_ticket_system, accounts):
    """Fixture to deploy a malicious contract for reentrancy attack"""
    malicious_code = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface MainTicketSystem {
    function getTicketPrice() external view returns (uint256);
    function purchaseTicket() external payable returns (uint256);
}

contract Malicious {
    MainTicketSystem public ticketSystem;
    uint256 public attackCount;
    uint256 public ticketId;
    uint256 public ticketPrice;
    bool public acceptEther = true;
    constructor(address _ticketSystem) {
        ticketSystem = MainTicketSystem(_ticketSystem);
    }

    receive() external payable {
        if (acceptEther) 
        {
            acceptEther = false;
            return;
        }
        if (attackCount < 5) {
            attackCount++;
            ticketId = ticketSystem.purchaseTicket{value: msg.value}();
        }
    }

    function attack() external payable {
        ticketPrice = ticketSystem.getTicketPrice();
        require(msg.value > ticketPrice, "Insufficient funds");
        ticketId = ticketSystem.purchaseTicket{value: msg.value}();
        }
}
"""
    compiled = compile_source(malicious_code, solc_version="0.8.2")
    Malicious = compiled['Malicious']
    # Deploy the malicious contract
    Malicious = Malicious.deploy(main_ticket_system.address, {'from': accounts[1]})
    accounts[1].transfer(Malicious,"20 ether")  # Ensure malicious contract has funds
    accounts[1].transfer(main_ticket_system, "10 ether")  # Ensure main contract has funds
    return Malicious


def test_reentrancy_attack_purchaseTicket(main_ticket_system, owner_account, malicious_contract_purchaseTicket):
    """Test for reentrancy attack in claimPrize function"""
    ticket_price = main_ticket_system.getTicketPrice()
    assert main_ticket_system.getContractBlance() == "10 ether", "Contract balance should be same before ticket purchase"
    assert main_ticket_system.getPlayerTickets(malicious_contract_purchaseTicket) == [], "Malicious contract should not have any tickets before attack"
    with reverts("Refund failed"):
        tx = malicious_contract_purchaseTicket.attack({'from': malicious_contract_purchaseTicket, 'value': ticket_price + Wei("0.1 ether")})

    # Verify malicious contract has no ticket
    tickets = main_ticket_system.getPlayerTickets(malicious_contract_purchaseTicket)
    assert len(tickets) == 0, "Malicious contract should not have any tickets after attack"

@pytest.fixture
def test_dos_attack_gas_limit(main_ticket_system, owner_account):
    """Test for DoS attack by purchasing many tickets to cause gas limit issues"""
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Simulate many users purchasing tickets
    for i in range(1, 50):  # Attempt to add 49 participants
        try:
            main_ticket_system.purchaseTicket({'from': accounts[i % 10], 'value': ticket_price})
            ticket_id = i
            ticket_hash = web3.keccak(text=f"hash_{i}")
            ticket_hash_with_strong = web3.keccak(text=f"strong_hash_{i}")
            if main_ticket_system.isLotteryActive():
                main_ticket_system.selectTicketsForLottery(
                ticket_id, ticket_hash, ticket_hash_with_strong, {'from': accounts[i % 10]})
        except exceptions.VirtualMachineError:
            # Gas limit may be hit, but contract should still function
            pass
    
    # Verify lottery can still close
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)
    try:
        main_ticket_system.closeLotteryRound({'from': owner_account})
    except exceptions.VirtualMachineError:
        pass
    
    # Verify lottery can still draw
    chain.mine(1)
    main_ticket_system.drawLotteryWinner(
        web3.keccak(text="random_hash"), 
        web3.keccak(text="random_strong_hash"), 
        [1,2,3,4,5,6], 1, 
        {'from': owner_account}
    )
    
    # Verify new round starts
    assert main_ticket_system.isLotteryActive() == True
    assert main_ticket_system.getContractBlance() >= 0

@pytest.fixture 
def reject_ether_contract(accounts):
    """Fixture to deploy a contract that rejects Ether transfers"""
    reject_ether_code = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
contract RejectEther 
{
    bool acceptEther = true;
    receive() external payable 
    {
        if (acceptEther) 
        {
            acceptEther = false;
            return;
        }
        revert("No Ether accepted");
    }
}
"""
    compiled = compile_source(reject_ether_code, solc_version="0.8.2")
    RejectEther = compiled['RejectEther']
    # Deploy the contract
    reject_ether = RejectEther.deploy({'from': accounts[1]})
    # Fund the contract with Ether to cover ticket price and gas
    accounts[1].transfer(reject_ether, "10 ether")
    return reject_ether

def test_unchecked_return_value_purchaseTicket(main_ticket_system, reject_ether_contract):
    """Test for unchecked return value vulnerability in Ether transfers"""
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Attempt to purchase ticket with refund to rejecting contract
    with reverts("Refund failed"):
        main_ticket_system.purchaseTicket({'from': reject_ether_contract, 'value': ticket_price * 2})
    
    # Verify no ticket was issued
    assert len(main_ticket_system.getPlayerTickets(reject_ether_contract)) == 0
    assert main_ticket_system.getContractBlance() == 0

def test_unchecked_return_value_claimPrize(main_ticket_system, reject_ether_contract):
    """Test for unchecked return value vulnerability in claimPrize"""
    
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Verify RejectEther contract has sufficient balance
    assert reject_ether_contract.balance() >= ticket_price, "RejectEther contract should have enough balance to cover ticket price"
    # Purchase a ticket normally
    tx = main_ticket_system.purchaseTicket({'from': reject_ether_contract, 'value': ticket_price})
    ticket_id = tx.return_value
    ticket_hash = web3.keccak(text="hash_reject")
    ticket_hash_with_strong = web3.keccak(text="strong_hash_reject")
    main_ticket_system.selectTicketsForLottery(
        ticket_id, 
        ticket_hash, 
        ticket_hash_with_strong, 
        {'from': reject_ether_contract}
    )
    # Close lottery and draw winner
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)
    main_ticket_system.closeLotteryRound({'from': accounts[0]})
    chain.mine(1)
    main_ticket_system.drawLotteryWinner(
        ticket_hash, 
        ticket_hash_with_strong, 
        [1,2,3,4,5,6], 1, 
        {'from': accounts[0]}
    )
    # Verify RejectEther has a pending prize
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    big_prize = round_info[4]  # big_prize from round_info
    prize = main_ticket_system.getPendingPrize(reject_ether_contract, {'from': reject_ether_contract})
    assert prize == big_prize, "RejectEther should have a pending prize"
    contract_balance_before = main_ticket_system.getContractBlance()
    # Attempt to claim prize, which should fail due to unchecked return value
    with reverts("Prize transfer failed"):
        main_ticket_system.claimPrize(reject_ether_contract, {'from': reject_ether_contract})
    assert main_ticket_system.getPendingPrize(reject_ether_contract, {'from': reject_ether_contract}) == big_prize, "Pending prize should remain unchanged"
    assert main_ticket_system.getContractBlance() == contract_balance_before, "Contract balance should remain unchanged after failed claim"
    

def test_front_running_attack(main_ticket_system, owner_account):
    """Test for front-running attack in selectTicketsForLottery"""
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Honest user purchases a ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price})
    ticket_id = tx.return_value
    
    # Attacker monitors mempool and submits transaction with higher gas
    ticket_hash = web3.keccak(text="hash_1")
    ticket_hash_with_strong = web3.keccak(text="strong_hash_1")
    
    # Honest user attempts to select ticket
    honest_tx = main_ticket_system.selectTicketsForLottery(
        ticket_id, ticket_hash, ticket_hash_with_strong, 
        {'from': accounts[1], 'gas_price': web3.eth.gas_price}
    )
    
    # Attacker front-runs with higher gas price
    attacker_account = accounts[2]
    tx = main_ticket_system.purchaseTicket({'from': attacker_account, 'value': ticket_price})
    ticket_id = tx.return_value
    attacker_tx = main_ticket_system.selectTicketsForLottery(
        ticket_id , ticket_hash, ticket_hash_with_strong, 
        {'from': attacker_account, 'gas_price': web3.eth.gas_price * 2}
    )
    
    # Honest user transaction should still succeed if not front-run
    main_ticket_system.selectTicketsForLottery(
        ticket_id, ticket_hash, ticket_hash_with_strong, 
        {'from': accounts[1]}
    )
    
    # Close and draw lottery
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)
    if main_ticket_system.isLotteryActive():
        main_ticket_system.closeLotteryRound({'from': owner_account})
    chain.mine(1)
    
    # Draw winner with attacker's hash
    main_ticket_system.drawLotteryWinner(
        ticket_hash, ticket_hash_with_strong, [1,2,3,4,5,6], 1, 
        {'from': owner_account}
    )
    
    # Both users may win due to same hash, no front-running advantage
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    big_prize_winners = round_info[2][2]  # addressArrays[2]
    assert accounts[1].address in big_prize_winners
    assert attacker_account.address in big_prize_winners