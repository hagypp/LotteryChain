import React, { useEffect, useState } from 'react';
import './ExchangeButton.css';

const ExchangeButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ethAmount, setEthAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [targetCurrency, setTargetCurrency] = useState("USD");

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    setEthAmount('');
    setFiatAmount('');
  };

  const handleCurrencyChange = (e) => {
    setTargetCurrency(e.target.value);
    setEthAmount('');
    setFiatAmount('');
  };

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=${targetCurrency.toLowerCase()}`
        );
        const data = await response.json();
        setExchangeRate(data.ethereum[targetCurrency.toLowerCase()]);
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      }
    };

    fetchExchangeRate();
  }, [targetCurrency]);

  const handleEthChange = (e) => {
    const eth = e.target.value;
    setEthAmount(eth);
    if (exchangeRate && !isNaN(eth)) {
      setFiatAmount((eth * exchangeRate).toFixed(2));
    } else {
      setFiatAmount('');
    }
  };

  const handleFiatChange = (e) => {
    const fiat = e.target.value;
    setFiatAmount(fiat);
    if (exchangeRate && !isNaN(fiat)) {
      setEthAmount((fiat / exchangeRate).toFixed(6));
    } else {
      setEthAmount('');
    }
  };

  return (
    <div className="exchange-button-container">
      <button 
        className="exchange-button"
        onClick={toggleModal}
        aria-label="Currency Exchange"
      >
        💱
      </button>

      {isModalOpen && (
        <div className="exchange-modal" onClick={toggleModal}>
          <div 
            className="exchange-modal-content" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exchange-modal-header">
              <button 
                className="close-button" 
                onClick={toggleModal}
                aria-label="Close"
              >
                ✖️
              </button>
            </div>

            <div className="exchange-modal-body">
              <h2 className="section-title">💱 ETH ⇄ {targetCurrency} Converter</h2>
              {exchangeRate ? (
                <>
                <div className="input-group">
                <label>Currency</label>
                  <select value={targetCurrency} onChange={handleCurrencyChange}>
                  <option value="usd">USD</option>
                    <option value="aed">AED</option>
                    <option value="ars">ARS</option>
                    <option value="aud">AUD</option>
                    <option value="bdt">BDT</option>
                    <option value="bhd">BHD</option>
                    <option value="bmd">BMD</option>
                    <option value="brl">BRL</option>
                    <option value="cad">CAD</option>
                    <option value="chf">CHF</option>
                    <option value="clp">CLP</option>
                    <option value="cny">CNY</option>
                    <option value="czk">CZK</option>
                    <option value="dkk">DKK</option>
                    <option value="eur">EUR</option>
                    <option value="gbp">GBP</option>
                    <option value="gel">GEL</option>
                    <option value="hkd">HKD</option>
                    <option value="huf">HUF</option>
                    <option value="idr">IDR</option>
                    <option value="ils">ILS</option>
                    <option value="inr">INR</option>
                    <option value="jpy">JPY</option>
                    <option value="krw">KRW</option>
                    <option value="kwd">KWD</option>
                    <option value="lkr">LKR</option>
                    <option value="mmk">MMK</option>
                    <option value="mxn">MXN</option>
                    <option value="myr">MYR</option>
                    <option value="ngn">NGN</option>
                    <option value="nok">NOK</option>
                    <option value="nzd">NZD</option>
                    <option value="php">PHP</option>
                    <option value="pkr">PKR</option>
                    <option value="pln">PLN</option>
                    <option value="rub">RUB</option>
                    <option value="sar">SAR</option>
                    <option value="sek">SEK</option>
                    <option value="sgd">SGD</option>
                    <option value="thb">THB</option>
                    <option value="try">TRY</option>
                    <option value="twd">TWD</option>
                    <option value="uah">UAH</option>
                    <option value="vef">VEF</option>
                    <option value="vnd">VND</option>
                    <option value="zar">ZAR</option>
                    <option value="xdr">XDR</option>
                    <option value="xag">XAG</option>
                    <option value="xau">XAU</option>
                    {/* Add more currencies if needed */}
                  </select>
                  </div>
                  <div className="input-group">
                    <label>ETH</label>
                    <input 
                      type="number" 
                      value={ethAmount}
                      onChange={handleEthChange}
                      placeholder="Enter ETH"
                    />
                  </div>

                  <div className="input-group">
                    <label>{targetCurrency.toUpperCase()}</label>
                    <input 
                      type="number" 
                      value={fiatAmount}
                      onChange={handleFiatChange}
                      placeholder={`Enter ${targetCurrency}`}
                    />
                  </div>

                  <p className="rate-info">
                    Current rate: 1 ETH ≈ {exchangeRate} {targetCurrency}
                  </p>
                </>
              ) : (
                <p>Loading exchange rate...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeButton;
