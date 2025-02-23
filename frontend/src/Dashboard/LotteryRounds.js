import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import { Clock, Trophy, Users, Check, ArrowRight, RefreshCw } from 'lucide-react';

const LotteryRounds = ({ refreshTrigger }) => {
  const [rounds, setRounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRounds = async () => {
    try {
      setIsRefreshing(true);
      const roundsInfo = await contractService.getAllLotteryRoundsInfo();
      console.log('Fetched rounds:', roundsInfo);
      setRounds(roundsInfo);
      setError(null);
    } catch (error) {
      console.error('Error fetching lottery rounds:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRounds();
  }, []);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchRounds();
    }
  }, [refreshTrigger]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    await fetchRounds();
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
          <span className="text-gray-600">Loading lottery rounds...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error loading lottery rounds: {error}
        <button 
          onClick={handleManualRefresh}
          className="ml-4 text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Lottery Rounds History</h2>
        <button 
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rounds && rounds.length > 0 ? (
          rounds.map((round) => (
            <div key={round.roundNumber} className="bg-gray-50 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Round #{round.roundNumber}</h3>
                <span className={`flex items-center px-2 py-1 rounded ${
                  round.isFinalized ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {round.isFinalized ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <Clock className="w-4 h-4 mr-1" />
                  )}
                  {round.isFinalized ? 'Completed' : 'Active'}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <Trophy className="w-5 h-5 text-yellow-600 mr-2" />
                  <div>
                    <span className="block text-sm text-gray-600">Prize Pool</span>
                    <span className="font-medium">{round.totalPrizePool} ETH</span>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <span className="block text-sm text-gray-600">Participants</span>
                    <span className="font-medium">{round.participants.length}</span>
                  </div>
                </div>
              </div>

              {round.isFinalized && round.winner !== '0x0000000000000000000000000000000000000000' && (
                <div className="mt-4 pt-3 border-t">
                  <span className="block text-sm text-gray-600 mb-1">Winner</span>
                  <span className="flex items-center text-sm font-mono bg-gray-100 p-2 rounded">
                    {`${round.winner.slice(0, 6)}...${round.winner.slice(-4)}`}
                    <ArrowRight className="w-4 h-4 ml-2 text-gray-500" />
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            No lottery rounds found
          </div>
        )}
      </div>
    </div>
  );
};

export default LotteryRounds;