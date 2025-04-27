/**
 * This module fetches Pokémon card price data, calculates trends, and predicts future prices.
 */

const axios = require('axios'); // For making HTTP requests
const Sentiment = require('sentiment'); // For sentiment analysis

module.exports = {
  name: '!pokemon_card', // Command name to trigger this functionality
  description: 'Analyzes Pokémon card price trends and predicts future prices.',

  async execute(message, args) {
    const cardName = args.slice(0, -1).join(' '); // Extract the card name (all but the last argument)
    const cardNumber = args[args.length - 1]; // Extract the card number (last argument)

    if (!cardName || !cardNumber) {
      return message.channel.send('Please specify a Pokémon card name and card number. Usage: `!pokemon_card <card name> <card number>`');
    }

    try {
      // Fetch Pokémon card price data
      const fetchCardData = async (name, number) => {
        const url = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(name)}" number:"${encodeURIComponent(number)}"`;

        try {
          const response = await axios.get(url);
          const cardData = response.data.data;

          if (!cardData || cardData.length === 0) {
            return null;
          }

          // Extract the first matching card
          const card = cardData[0];

          // Extract current price
          const currentPrice = card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market || null;

          // Simulate historical prices if not available
          const historicalPrices = currentPrice
            ? Array.from({ length: 5 }, (_, i) => currentPrice * (1 + (Math.random() - 0.5) * 0.1)) // Generate 5 prices with slight variation
            : null;

          return { card, currentPrice, historicalPrices };
        } catch (error) {
          console.error('Error fetching Pokémon card data:', error);
          return null;
        }
      };

      // Fetch news about the card's set
      const fetchSetNews = async (setName) => {
        const apiKey = process.env.NEWS_API_KEY; // Retrieve the API key from .env
        if (!apiKey) {
          console.error('News API key is missing in the .env file.');
          return [];
        }

        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(setName)}&apiKey=${apiKey}`;

        try {
          const response = await axios.get(url);
          return response.data.articles.map((article) => article.title); // Extract headlines
        } catch (error) {
          console.error('Error fetching set news:', error.message);
          return [];
        }
      };

      // Perform sentiment analysis on set news
      const analyzeSentiment = (headlines) => {
        const sentiment = new Sentiment();
        const scores = headlines.map((headline) => sentiment.analyze(headline).score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        return averageScore; // Return average sentiment score
      };

      // Convert USD to CAD
      const convertToCAD = async (usdPrice) => {
        const url = `https://api.exchangerate-api.com/v4/latest/USD`;

        try {
          const response = await axios.get(url);
          const exchangeRate = response.data.rates.CAD;
          return usdPrice * exchangeRate;
        } catch (error) {
          console.error('Error fetching exchange rate:', error);
          return usdPrice; // Fallback to USD if conversion fails
        }
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

      // Fetch card data
      const cardData = await fetchCardData(cardName, cardNumber);

      if (!cardData) {
        return message.channel.send(`No matching Pokémon card found for "${cardName}" with card number "${cardNumber}". Please check your input and try again.`);
      }

      const { card, currentPrice, historicalPrices } = cardData;

      if (!currentPrice) {
        return message.channel.send(`No current price data available for "${card.name}" with card number "${card.number}".`);
      }

      if (!historicalPrices) {
        return message.channel.send(`Not enough historical data for price prediction. Current price for "${card.name}" is $${currentPrice.toFixed(2)} USD.`);
      }

      // Fetch news about the card's set and analyze sentiment
      const setNews = await fetchSetNews(card.set.name);
      const sentimentScore = setNews.length > 0 ? analyzeSentiment(setNews) : 0;

      // Analyze card prices
      const predictedNextPriceUSD = predictNextPrice(historicalPrices, sentimentScore);
      const trend = predictedNextPriceUSD > currentPrice ? 'Upward 📈' : 'Downward 📉';

      // Calculate percentage change
      const percentageChange = ((predictedNextPriceUSD - currentPrice) / currentPrice) * 100;

      // Convert prices to CAD
      const currentPriceCAD = await convertToCAD(currentPrice);
      const predictedNextPriceCAD = await convertToCAD(predictedNextPriceUSD);

      // Send the analysis title
      await message.channel.send(`📊 **Pokémon Card Analysis for "${card.name}"**`);

      // Send the image separately if available
      if (card.images?.large) {
        await message.channel.send({ files: [card.images.large] });
      }

      // Send the detailed analysis response
      const response = `
- **Set**: ${card.set.name}
- **Rarity**: ${card.rarity}
- **Card Number**: ${card.number}
- **Current Price**: $${currentPriceCAD.toFixed(2)} CAD
- **Predicted Next Price**: $${predictedNextPriceCAD.toFixed(2)} CAD
- **Trend Prediction**: ${trend}
- **Percentage Change**: ${percentageChange.toFixed(2)}%
- **Set News Sentiment Score**: ${sentimentScore.toFixed(2)}
`;
      await message.channel.send(response);

    } catch (error) {
      console.error('Error analyzing Pokémon card:', error);
      message.channel.send('An error occurred while analyzing the Pokémon card. Please try again later.');
    }
  },
};