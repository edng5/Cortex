/**
 * This module fetches stock data, calculates moving averages, detects crossovers, and predicts trends.
 */

const axios = require('axios'); // For making HTTP requests

module.exports = {
  name: '!stock', // Command name to trigger this functionality
  description: 'Analyzes stock data and provides insights.',

  /**
   * Executes the !stock command.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command. 
   *                       args[0] is the stock symbol (e.g., "AAPL").
   */
  async execute(message, args) {
    const stockSymbol = args[0]?.toUpperCase(); // Get the stock symbol from the arguments

    if (!stockSymbol) {
      return message.channel.send('Please specify a stock symbol. Usage: `!stock <symbol>`');
    }

    try {
      // Fetch historical stock prices
      const fetchStockData = async (symbol) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=6mo&interval=1d`;

        try {
          const response = await axios.get(url);
          const timestamps = response.data.chart.result[0].timestamp;
          const prices = response.data.chart.result[0].indicators.quote[0].close;

          return prices.filter((p) => p !== null); // Filter out null prices
        } catch (error) {
          console.error('Error fetching stock data:', error);
          return null;
        }
      };

      // Moving Average calculation
      const movingAverage = (data, windowSize) => {
        const averages = [];
        for (let i = windowSize - 1; i < data.length; i++) {
          const window = data.slice(i - windowSize + 1, i + 1);
          const avg = window.reduce((a, b) => a + b, 0) / window.length;
          averages.push(avg);
        }
        return averages;
      };

      // Detect Golden Cross / Death Cross
      const detectCross = (shortMA, longMA) => {
        const n = Math.min(shortMA.length, longMA.length);
        const lastShort = shortMA[n - 1];
        const lastLong = longMA[n - 1];
        const prevShort = shortMA[n - 2];
        const prevLong = longMA[n - 2];

        if (prevShort < prevLong && lastShort > lastLong) {
          return 'Golden Cross (Bullish signal) 🟢';
        } else if (prevShort > prevLong && lastShort < lastLong) {
          return 'Death Cross (Bearish signal) 🔴';
        } else {
          return 'No major cross detected ⚪';
        }
      };

      // Simple linear regression for prediction
      const predictNextPrice = (prices) => {
        const x = Array.from({ length: prices.length }, (_, i) => i);
        const y = prices;

        const n = y.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const nextX = prices.length;
        const predictedPrice = slope * nextX + intercept;

        return predictedPrice;
      };

      // Fetch stock data
      const prices = await fetchStockData(stockSymbol);

      if (!prices || prices.length < 60) {
        return message.channel.send('Not enough data for deep analysis. Please try another stock symbol.');
      }

      // Analyze stock
      const shortMA = movingAverage(prices, 20); // 20-day MA
      const longMA = movingAverage(prices, 50);  // 50-day MA

      const crossSignal = detectCross(shortMA, longMA);
      const predictedNextPrice = predictNextPrice(prices);
      const lastPrice = prices[prices.length - 1];
      const trend = predictedNextPrice > lastPrice ? 'Upward 📈' : 'Downward 📉';

      // Calculate percentage change
      const percentageChange = ((predictedNextPrice - lastPrice) / lastPrice) * 100;

      // Send analysis to the Discord channel
      const response = `
📊 **Stock Analysis for ${stockSymbol}**
- **Latest Price**: $${lastPrice.toFixed(2)}
- **Predicted Next Price**: $${predictedNextPrice.toFixed(2)}
- **Trend Prediction**: ${trend}
- **Percentage Change**: ${percentageChange.toFixed(2)}%
- **Crossover Signal**: ${crossSignal}
      `;

      message.channel.send(response);
    } catch (error) {
      console.error('Error analyzing stock:', error);
      message.channel.send('An error occurred while analyzing the stock. Please try again later.');
    }
  },
};