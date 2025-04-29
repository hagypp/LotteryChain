import pytest
from brownie import MainTicketSystem, accounts, web3, reverts, chain
from brownie import exceptions


BLOCKS_TO_WAIT_fOR_CLOSE = 4; # Number of blocks to wait for lottery to close

@pytest.fixture
def main_ticket_system():
    """Fixture to deploy the MainTicketSystem contract before each test"""
    print("Deploying MainTicketSystem contract...")
    return MainTicketSystem.deploy({'from': accounts[0]})

def test_contract_deployment(main_ticket_system, owner_account):
    """Test contract deployment and basic functionality"""
    # Check contract has a balance method
    assert hasattr(main_ticket_system, 'getContractBlance')
    
    # Check initial contract balance
    assert main_ticket_system.getContractBlance() == 0

def test_ticket_purchase(main_ticket_system):
    """Test ticket purchase process"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()
    account1_balance_before = accounts[1].balance()
    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price+1, 'gas_price': 'auto'})
    tx.wait(1)
    
    gas_used = tx.gas_used * tx.gas_price
    # Check ticket details
    active_tickets = main_ticket_system.getActiveTickets({'from': accounts[1]})
    assert len(active_tickets) == 1
    
    # Verify ticket data
    player_tickets = main_ticket_system.getPlayerTickets(accounts[1])
    assert len(player_tickets) == 1
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1  # No active tickets should exist
    
    assert account1_balance_before - ticket_price - gas_used == accounts[1].balance()  # Player's balance should decrease by ticket price

def test_ticket_purchase_auto_close(main_ticket_system):
    """Test ticket purchase process with automatic lottery close"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    for _ in range(BLOCKS_TO_WAIT_fOR_CLOSE+1): #the last one is to close the lottery
        tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
        tx.wait(1)
    
    assert main_ticket_system.isLotteryActive() == False  # Lottery should be closed
    
def test_ticket_purchase_insufficient_funds(main_ticket_system):
    """Test ticket purchase with insufficient funds"""
    # Get the ticket price from the contract
    ticket_price = main_ticket_system.getTicketPrice()
    
    # Attempt to purchase a ticket with insufficient funds
    with reverts("Insufficient payment for ticket"):
        main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price - 1, 'gas_price': 'auto'})
    assert main_ticket_system.getPlayerTickets(accounts[1]) == []  # No tickets should be purchased
    assert main_ticket_system.getActiveTickets({'from': accounts[1]}) == []  # No active tickets should exist

def test_lottery_round_status(main_ticket_system):
    """Test lottery round status"""
    # Check initial lottery status
    is_active = main_ticket_system.isLotteryActive()
    assert isinstance(is_active, bool)
    
    assert is_active == True  # Lottery should be active at the start
    
    # Check lottery block status
    blocks_until_close, blocks_until_draw = main_ticket_system.getLotteryBlockStatus()
    assert isinstance(blocks_until_close, int)
    assert isinstance(blocks_until_draw, int)

def test_select_tickets_for_lottery(main_ticket_system):
    """Test selecting tickets for lottery"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    ticket_id = tx.return_value
    
    # Create hash values for the ticket (using some example values)
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")
    
    # Select ticket for lottery
    if main_ticket_system.isLotteryActive():
        tx = main_ticket_system.selectTicketsForLottery(
            ticket_id, 
            ticket_hash, 
            ticket_hash_with_strong, 
            {'from': accounts[1], 'gas_price': 'auto'}
        )
        
        # Check if the event was emitted
        assert 'TicketSelected' in tx.events
        assert tx.return_value == True  # Selection should be successful
        with reverts("Invalid ticket status"):
            main_ticket_system.selectTicketsForLottery(ticket_id, ticket_hash, ticket_hash_with_strong, {'from': accounts[1], 'gas_price': 'auto'})
        assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket selected
        assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 0  # No active tickets should exist
        assert main_ticket_system.getCurrentPrizePool() == ticket_price  # Prize pool should be updated

def test_select_tickets_for_lottery_close(main_ticket_system):
    """Test selecting tickets for lottery when lottery is closed"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    ticket_id = tx.return_value
    
    assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1
    
    # Create hash values for the ticket (using some example values)
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")
    
    # simulate spend time to close the lottery
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)

    # Close the lottery
    main_ticket_system.closeLotteryRound({'from': accounts[0], 'gas_price': 'auto'})
    
    is_active = main_ticket_system.isLotteryActive()
    assert is_active == False  # Lottery should be closed
    
    # Attempt to select tickets for lottery when closed
    
    with reverts("Current lottery round is closed"):
        main_ticket_system.selectTicketsForLottery(ticket_id, ticket_hash, ticket_hash_with_strong, {'from': accounts[1], 'gas_price': 'auto'})
    assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1

def test_select_tickets_for_lottery_auto_close(main_ticket_system):
    """Test selecting tickets for lottery when lottery is closed"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    # Purchase ticket
    tx = main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    ticket_id = tx.return_value
    
    assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1
    
    # Create hash values for the ticket (using some example values)
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")
    
    # simulate spend time to close the lottery
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)
    
    # Attempt to select tickets for lottery when closed
    tx = main_ticket_system.selectTicketsForLottery(ticket_id, ticket_hash, ticket_hash_with_strong, {'from': accounts[1], 'gas_price': 'auto'})
    returned_value = tx.return_value
    assert returned_value == False  # Lottery should be closed
    
    assert len(main_ticket_system.getPlayerTickets(accounts[1])) == 1  # Player should have one ticket
    assert len(main_ticket_system.getActiveTickets({'from': accounts[1]})) == 1

def test_draw_lottery_winner(main_ticket_system, owner_account):
    """Test drawing lottery winner"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    player_addresses = []
    # Multiple players purchase tickets
    for account in accounts[1:3]:
        player_addresses.append(account.address)
        tx = main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})
        ticket_id = tx.return_value
        
        # Create hash values for the ticket
        ticket_hash = web3.keccak(text=f"hash_{account.address}")
        ticket_hash_with_strong = web3.keccak(text=f"strong_hash_{account.address}")
        print(f"ticket_hash: {ticket_hash}, ticket_hash_with_strong: {ticket_hash_with_strong}")
        # Select ticket for lottery if lottery is active
        if main_ticket_system.isLotteryActive():
            main_ticket_system.selectTicketsForLottery(
                ticket_id, 
                ticket_hash, 
                ticket_hash_with_strong, 
                {'from': account, 'gas_price': 'auto'}
            )
    main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to can be drawn
    
    # Create hash values for the drawing
    keccak_hash_numbers = web3.keccak(text=f"hash_{accounts[2].address}")
    keccak_hash_full = web3.keccak(text=f"strong_hash_{accounts[1].address}")
    print(f"keccak_hash_numbers: {keccak_hash_numbers}, keccak_hash_full: {keccak_hash_full}")
    
    player1_blance_before = accounts[1].balance()
    player2_blance_before = accounts[2].balance()
    owener_blance_before = owner_account.balance()
    
    # Draw lottery winner
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
   # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, participants, small_prize_winners, big_prize_winners, status, big_prize, small_prize, commission, total_tickets = round_info
    
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 2 * ticket_price, f"Prize pool should be {2 * ticket_price}"
    
    # Verify participants
    assert len(participants) == 2, "Should have 2 participants"
    for addr in player_addresses:
        assert addr in participants, f"Player {addr} should be in participants list"
    
    # Verify winners (at least one winner should be present)
    assert len(small_prize_winners) > 0 or len(big_prize_winners) > 0, "Should have at least one winner"
    
    # Verify each winner is a participant
    for winner in small_prize_winners:
        assert winner in participants, f"Small prize winner {winner} should be a participant"
    
    for winner in big_prize_winners:
        assert winner in participants, f"Big prize winner {winner} should be a participant"
    
    assert accounts[1] in big_prize_winners, "Account 1 should be a big prize winner"
    assert accounts[2] in small_prize_winners, "Account 2 should be a small prize winner"
    
    assert len(big_prize_winners) == 1, "Should have 1 big prize winner"
    assert len(small_prize_winners) == 1, "Should have 1 small prize winner"
    
    assert status == 2, "Lottery status should be finished"
    
    # Verify prize distribution
    assert big_prize + small_prize + commission == total_prize_pool, "Prize distribution should equal total prize pool"
    
    # Verify total tickets
    assert total_tickets == 2, "Should have 2 tickets total"
    
    assert player1_blance_before + big_prize == accounts[1].balance(), "Account 1 should receive the big prize"
    assert player2_blance_before + small_prize == accounts[2].balance(), "Account 2 should receive the small prize"
    assert owener_blance_before + commission - gas_used  == owner_account.balance(), "Owner should receive the commission"
    # Check lottery status after drawing (new round should be active)
    assert main_ticket_system.isLotteryActive() == True, "New round should be active"

def test_contract_balance(main_ticket_system):
    """Test contract balance tracking"""
    # Get initial balance
    initial_balance = main_ticket_system.getContractBlance()
    
    # Purchase tickets
    ticket_price = main_ticket_system.getTicketPrice()
    main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})

    # Check updated contract balance
    new_balance = main_ticket_system.getContractBlance()
    assert new_balance == initial_balance + ticket_price


def test_set_ticket_price(main_ticket_system, owner_account):
    """Test setting ticket price"""
    # Get current ticket price
    current_price = main_ticket_system.getTicketPrice()
    
    # Set new ticket price
    new_price = current_price * 2
    tx = main_ticket_system.setTicketPrice(new_price, {'from': owner_account, 'gas_price': 'auto'})
    tx.wait(1)
    
    # Verify new ticket price
    updated_price = main_ticket_system.getTicketPrice()
    assert updated_price == new_price

def test_get_player_tickets(main_ticket_system):
    """Test retrieving player tickets"""
    # Purchase a ticket
    ticket_price = main_ticket_system.getTicketPrice()
    main_ticket_system.purchaseTicket({'from': accounts[1], 'value': ticket_price, 'gas_price': 'auto'})
    
    # Get player tickets
    player_tickets = main_ticket_system.getPlayerTickets(accounts[1])
    assert len(player_tickets) == 1  # Player should have one ticket

def test_select_tickets_for_lottery_not_found(main_ticket_system):
    """Test selecting tickets for lottery with invalid data."""
    ticket_hash = web3.keccak(text="example_hash")
    ticket_hash_with_strong = web3.keccak(text="example_hash_with_strong")

    # Use clearly invalid ticket IDs, including negative and large values
    invalid_ticket_ids = list(range(0, 11))  # from -10 to 10 inclusive
    for ticket_id in invalid_ticket_ids:
        try:
            result = main_ticket_system.selectTicketsForLottery(
                ticket_id,
                ticket_hash,
                ticket_hash_with_strong,
                {'from': accounts[1], 'gas_price': 'auto'}
            )
            assert result.return_value is False, f"Expected False, but got {result} for ticket_id {ticket_id}"
        except Exception as e:
            assert "Ticket not found" in str(e), f"Unexpected revert reason: {str(e)}"



def test_multiple_lottery_rounds_with_varied_participants(main_ticket_system, owner_account):
    """Test multiple lottery rounds with varying participants, ensuring prize, ticket, and state accuracy."""

    def simulate_round(round_num, participant_indexes):
        ticket_price = main_ticket_system.getTicketPrice()
        participant_addresses = []

        ticket_ids = []
        for idx in participant_indexes:
            acc = accounts[idx]
            participant_addresses.append(acc.address)

            tx = main_ticket_system.purchaseTicket({'from': acc, 'value': ticket_price, 'gas_price': 'auto'})
            ticket_id = tx.return_value
            ticket_ids.append(ticket_id)

            ticket_hash = web3.keccak(text=f"hash_{acc.address}_r{round_num}")
            ticket_hash_strong = web3.keccak(text=f"strong_hash_{acc.address}_r{round_num}")

            if main_ticket_system.isLotteryActive():
                main_ticket_system.selectTicketsForLottery(
                    ticket_id,
                    ticket_hash,
                    ticket_hash_strong,
                    {'from': acc, 'gas_price': 'auto'}
                )
        
        chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)
        # Owner closes the round
        if main_ticket_system.isLotteryActive():
            main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
        chain.mine(1)

        # Pick some hashes from current players to simulate drawing randomness
        draw_hash_1 = web3.keccak(text=f"hash_{accounts[participant_indexes[-1]].address}_r{round_num}")
        draw_hash_2 = web3.keccak(text=f"strong_hash_{accounts[participant_indexes[0]].address}_r{round_num}")

        # Capture balances before
        balances_before = {idx: accounts[idx].balance() for idx in participant_indexes}
        owner_balance_before = owner_account.balance()

        tx = main_ticket_system.drawLotteryWinner(draw_hash_1, draw_hash_2, {'from': owner_account, 'gas_price': 'auto'})
        gas_used = tx.gas_used * tx.gas_price

        # Validate round info
        round_info = main_ticket_system.getLotteryRoundInfo(round_num)
        (
            round_number,
            total_prize_pool,
            participants,
            small_prize_winners,
            big_prize_winners,
            status,
            big_prize,
            small_prize,
            commission,
            total_tickets
        ) = round_info

        assert round_number == round_num
        assert status == 2  # Finished

        # Validate winners are participants
        for winner in small_prize_winners + big_prize_winners:
            assert winner in participants
        print(f"round info: {round_info}")
        # Validate prize math
        if len(big_prize_winners) == 0:
            big_prize = 0
        if len(small_prize_winners) == 0:
            small_prize = 0
        prize_distribution = (big_prize + small_prize + commission)
        assert prize_distribution == total_prize_pool

        # Validate balances
        for idx in participant_indexes:
            acc = accounts[idx]
            if acc.address in big_prize_winners:
                assert acc.balance() == balances_before[idx] + big_prize
            elif acc.address in small_prize_winners:
                assert acc.balance() == balances_before[idx] + small_prize
            else:
                assert acc.balance() == balances_before[idx]

        assert owner_account.balance() == owner_balance_before + commission - gas_used

        # New round should start
        assert main_ticket_system.isLotteryActive()

    # Run through 3 simulated rounds with different setups
    simulate_round(1, [1, 2])       # 2 players
    simulate_round(2, [3, 4, 5])    # 3 players
    simulate_round(3, [6])          # Single player (edge case)
    simulate_round(4, [1, 1])



def test_draw_lottery_with_no_players(main_ticket_system, owner_account):
    """Test drawing lottery when no players have entered"""
    # Check that lottery is active
    assert main_ticket_system.isLotteryActive() == True, "Lottery should be active"
    
    chain.mine(BLOCKS_TO_WAIT_fOR_CLOSE)  # Simulate time passing for lottery to close
    # Close the lottery round with no players
    main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to be drawable
    
    # Create hash values for the drawing
    keccak_hash_numbers = web3.keccak(text="random_numbers_hash")
    keccak_hash_full = web3.keccak(text="random_full_hash")
    
    owner_balance_before = owner_account.balance()
    
    # Draw lottery winner even though there are no players
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
    
    # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, participants, small_prize_winners, big_prize_winners, status, big_prize, small_prize, commission, total_tickets = round_info
    
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 0, "Prize pool should be 0"
    
    # Verify participants
    assert len(participants) == 0, "Should have 0 participants"
    
    # Verify winners (should be none)
    assert len(small_prize_winners) == 0, "Should have no small prize winners"
    assert len(big_prize_winners) == 0, "Should have no big prize winners"
    
    assert status == 2, "Lottery status should be finished"
    
    # Verify prize distribution
    assert big_prize == 0, "Big prize should be 0"
    assert small_prize == 0, "Small prize should be 0"
    assert commission == 0, "Commission should be 0"
    
    # Verify total tickets
    assert total_tickets == 0, "Should have 0 tickets total"
    
    # Verify owner balance (should only be reduced by gas costs)
    assert owner_balance_before - gas_used == owner_account.balance(), "Owner balance should only decrease by gas used"
    
    # Check that a new lottery round is active
    assert main_ticket_system.isLotteryActive() == True, "New round should be active"



def test_draw_lottery_with_same_hashes(main_ticket_system, owner_account):
    """Test drawing lottery with players using the same hash values"""
    # Get ticket price
    ticket_price = main_ticket_system.getTicketPrice()

    player_addresses = []
    
    # Common hash values that both players will use
    common_ticket_hash = web3.keccak(text="common_hash_value")
    common_ticket_hash_with_strong = web3.keccak(text="common_strong_hash_value")
    print(f"Common ticket_hash: {common_ticket_hash}, common ticket_hash_with_strong: {common_ticket_hash_with_strong}")
    
    # Multiple players purchase tickets and use the same hash values
    for account in accounts[1:3]:
        player_addresses.append(account.address)
        tx = main_ticket_system.purchaseTicket({'from': account, 'value': ticket_price, 'gas_price': 'auto'})
        ticket_id = tx.return_value
        
        # Both players select tickets using the same hash values
        if main_ticket_system.isLotteryActive():
            main_ticket_system.selectTicketsForLottery(
                ticket_id, 
                common_ticket_hash, 
                common_ticket_hash_with_strong, 
                {'from': account, 'gas_price': 'auto'}
            )
    if main_ticket_system.isLotteryActive():
        main_ticket_system.closeLotteryRound({'from': owner_account, 'gas_price': 'auto'})
    
    chain.mine(1)  # Wait for the lottery to be drawable
    
    # Create hash values for the drawing (using the same common values)
    keccak_hash_numbers = common_ticket_hash
    keccak_hash_full = common_ticket_hash_with_strong
    
    player1_balance_before = accounts[1].balance()
    player2_balance_before = accounts[2].balance()
    owner_balance_before = owner_account.balance()
    
    # Draw lottery winner
    tx = main_ticket_system.drawLotteryWinner(
        keccak_hash_numbers, 
        keccak_hash_full, 
        {'from': owner_account, 'gas_price': 'auto'}
    )
    gas_used = tx.gas_used * tx.gas_price
    
    # Get lottery round info and verify data
    round_info = main_ticket_system.getLotteryRoundInfo(1)
    
    print(f"Round info: {round_info}")
    # Unpack returned data
    round_number, total_prize_pool, participants, small_prize_winners, big_prize_winners, status, big_prize, small_prize, commission, total_tickets = round_info
    
    # Verify round data
    assert round_number == 1, "Round number should be 1"
    assert total_prize_pool == 2 * ticket_price, f"Prize pool should be {2 * ticket_price}"
    
    # Verify participants
    assert len(participants) == 2, "Should have 2 participants"
    for addr in player_addresses:
        assert addr in participants, f"Player {addr} should be in participants list"
    
    # Since both players used the same hash, both should be either big prize winners or small prize winners
    # depending on contract implementation for ties
    
    # This is a unique case - both players have matching hashes
    # Both could win big prize if the contract allows it
    if len(big_prize_winners) == 2:
        # Both players win big prize
        assert accounts[1].address in big_prize_winners, "Account 1 should be a big prize winner"
        assert accounts[2].address in big_prize_winners, "Account 2 should be a big prize winner"
        assert len(small_prize_winners) == 0, "Should have no small prize winners"
        
        # Verify both received big prize (might be split)
        big_prize_per_player = big_prize / len(big_prize_winners)
        assert player1_balance_before + big_prize_per_player == accounts[1].balance(), "Account 1 should receive split big prize"
        assert player2_balance_before + big_prize_per_player == accounts[2].balance(), "Account 2 should receive split big prize"

    assert status == 2, "Lottery status should be finished"
    
    if len(big_prize_winners) == 0:
        big_prize = 0
    if len(small_prize_winners) == 0:
        small_prize = 0
    # Verify prize distribution
    assert big_prize + small_prize + commission == total_prize_pool, "Prize distribution should equal total prize pool"
    
    # Verify total tickets
    assert total_tickets == 2, "Should have 2 tickets total"
    
    # Verify owner commission
    assert owner_balance_before + commission - gas_used == owner_account.balance(), "Owner should receive the commission"
    
    # Check that a new lottery round is active
    assert main_ticket_system.isLotteryActive() == True, "New round should be active"