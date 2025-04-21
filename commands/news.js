/**
 * This module fetches top news headlines or weather information based on the specified category and location.
 * It uses the NewsAPI for news and supports ISO country codes for location filtering.
 */

const axios = require('axios'); // For making HTTP requests to APIs
const { getCode } = require('country-list'); // For converting country names to ISO codes

module.exports = {
  name: '!news', // Command name to trigger this functionality
  description: 'Fetches top news headlines or weather information.',

  /**
   * Executes the !news command.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command. 
   *                       args[0] is the category (e.g., business, sports, weather).
   *                       args[1+] is the optional location (e.g., Canada, US).
   */
  async execute(message, args) {
    const category = args[0]?.toLowerCase(); // Extract the category from the arguments
    let location = args.slice(1).join(' '); // Combine the remaining arguments as the location

    // Validate that a category is provided
    if (!category) {
      return message.channel.send('Please specify a category. Usage: `!news <category> [location]`');
    }

    try {
      // If the category is not "weather" and a location is provided, convert it to an ISO code
      if (category !== 'weather' && location && location.length > 2) {
        const isoCode = getCode(location); // Convert country name to ISO code
        if (!isoCode) {
          return message.channel.send(`Unable to find ISO code for the location: **${location}**.`);
        }
        location = isoCode.toLowerCase(); // Convert ISO code to lowercase for NewsAPI
      }

      // Prepare the API request parameters
      const newsApiKey = process.env.NEWS_API_KEY; // API key for NewsAPI
      const newsParams = { category, apiKey: newsApiKey }; // Base parameters for the API request
      if (location) newsParams.country = location; // Add the country parameter if a location is provided

      // Fetch news from the NewsAPI
      const newsResponse = await axios.get('https://newsapi.org/v2/top-headlines', { params: newsParams });
      const articles = newsResponse.data.articles.slice(0, 5); // Limit to the top 5 articles

      // If no articles are found, notify the user
      if (articles.length === 0) {
        return message.channel.send(`No news found for category **${category}** in **${location || 'Global'}**.`);
      }

      // Format the response message with the top articles
      let response = `📰 **Top News in ${category} (${location || 'Global'}):**\n`;
      articles.forEach((article, index) => {
        response += `${index + 1}. [${article.title}](${article.url})\n`; // Add each article as a numbered list
      });

      // Send the response back to the Discord channel
      message.channel.send(response);
    } catch (error) {
      // Log the error and notify the user
      console.error('Error fetching news:', error);
      message.channel.send('An error occurred while fetching the news.');
    }
  },
};