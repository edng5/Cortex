/**
 * This module fetches stock data, analyzes news sentiment, and predicts trends.
 */

const axios = require('axios'); // For making HTTP requests
const Sentiment = require('sentiment'); // For sentiment analysis
require('dotenv').config(); // Load environment variables from .env

module.exports = {
  name: '!stock', // Command name to trigger this functionality
  description: 'Analyzes stock data, news sentiment, and provides insights.',

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
          const prices = response.data.chart.result[0].indicators.quote[0].close;
          return prices.filter((p) => p !== null); // Filter out null prices
        } catch (error) {
          console.error('Error fetching stock data:', error);
          return null;
        }
      };

      // Fetch recent news headlines
      const fetchNewsHeadlines = async (symbol) => {
        const apiKey = process.env.NEWS_API_KEY; // Retrieve the API key from .env
        if (!apiKey) {
          console.error('News API key is missing in the .env file.');
          return [];
        }

        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(symbol)}&apiKey=${apiKey}`;

        try {
          const response = await axios.get(url);
          return response.data.articles.map((article) => article.title); // Extract headlines
        } catch (error) {
          console.error('Error fetching news headlines:', error.message);
          return [];
        }
      };

      // Perform sentiment analysis on news headlines
      const analyzeSentiment = (headlines) => {
        const sentiment = new Sentiment();
        const scores = headlines.map((headline) => sentiment.analyze(headline).score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        return averageScore; // Return average sentiment score
      };

      // Simple linear regression for prediction
      const predictNextPrice = (prices, sentimentScore) => {
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
        let predictedPrice = slope * nextX + intercept;

        // Adjust prediction based on sentiment score
        predictedPrice *= 1 + sentimentScore * 0.05; // Adjust by 5% per sentiment point
        return predictedPrice;
      };

      // Fetch stock data
      const prices = await fetchStockData(stockSymbol);

      if (!prices || prices.length < 60) {
        return message.channel.send('Not enough data for deep analysis. Please try another stock symbol.');
      }

      // Fetch news headlines and analyze sentiment
      const headlines = await fetchNewsHeadlines(stockSymbol);
      const sentimentScore = headlines.length > 0 ? analyzeSentiment(headlines) : 0;

      // Analyze stock prices
      const predictedNextPrice = predictNextPrice(prices, sentimentScore);
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
- **News Sentiment Score**: ${sentimentScore.toFixed(2)}
      `;

      message.channel.send(response);
    } catch (error) {
      console.error('Error analyzing stock:', error);
      message.channel.send('An error occurred while analyzing the stock. Please try again later.');
    }
  },
};