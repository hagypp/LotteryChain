import React from 'react';
import { LotteryProvider } from '../contexts/LotteryContext';
import LotteryHeader from './LotteryHeader';
import HardLottoGame from './HardLottoGame';
import WinnerAnnouncement from './WinnerAnnouncement';
import Notifications from './Notifications';
import contractService from '../services/contractService';
import "./Dashboard.css";
import InfoButton from './InfoButton';

const Dashboard = ({ account }) => {
  return (
    <LotteryProvider account={account}>
      <DashboardContent account={account} />
    </LotteryProvider>
  );
};

// Component that consumes the context
const DashboardContent = ({ account }) => {
  return (
    <div className="dashboard-container">
      <LotteryHeader />
      <InfoButton />
      <HardLottoGame account={account} />
      <WinnerAnnouncement account={account} contractService={contractService} />
      <Notifications />
    </div>
  );
};

export default Dashboard;