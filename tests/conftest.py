import pytest
from brownie import network, accounts

@pytest.fixture(scope="function")
def owner_account():
    """Fixture to provide the contract owner account"""
    return accounts[0]

@pytest.fixture(scope="function")
def player_accounts():
    """Fixture to provide player accounts"""
    return accounts[1:5]

def pytest_configure(config):
    """Configure pytest settings"""
    # Set the default network to development/local
    network.connect('development')

def pytest_unconfigure(config):
    """Disconnect from the network after tests"""
    network.disconnect()

@pytest.fixture(autouse=True)
def isolation(fn_isolation):
    """Isolation fixture to reset the blockchain state between tests"""
    pass