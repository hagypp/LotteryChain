import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Home from './Home/Home';
import Dashboard from './Dashboard/Dashboard';

function App() {
  const [account, setAccount] = useState(null);

  const handleConnection = (connectedAccount) => {
    setAccount(connectedAccount);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home onConnect={handleConnection} />} />
        <Route 
          path="/dashboard" 
          element={account ? <Dashboard account={account} /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;