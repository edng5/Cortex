/**
 * This module fetches the current weather for a specified location using the Weatherstack API.
 */

const axios = require('axios'); // For making HTTP requests to the Weatherstack API

module.exports = {
  name: '!weather', // Command name to trigger this functionality
  description: 'Fetches the current weather for a specified location.',

  /**
   * Executes the !weather command.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command. 
   *                       args[0+] is the location (e.g., "New York", "London").
   */
  async execute(message, args) {
    const location = args.join(' '); // Combine arguments into a single string for the location

    // Validate that a location is provided
    if (!location) {
      return message.channel.send('Please specify a location. Usage: `!weather <location>`');
    }

    try {
      // Fetch weather data from the Weatherstack API
      const weatherApiKey = process.env.WEATHER_API_KEY; // API key for Weatherstack
      const weatherResponse = await axios.get('http://api.weatherstack.com/current', {
        params: {
          access_key: weatherApiKey,
          query: location,
        },
      });

      const weatherData = weatherResponse.data;

      // Check if the API returned an error
      if (weatherData.error) {
        return message.channel.send(`Unable to fetch weather for **${location}**. Please check the location and try again.`);
      }

      // Extract weather details
      const { name, region, country } = weatherData.location;
      const { temperature, weather_descriptions, humidity, wind_speed, feelslike } = weatherData.current;

      // Format the response message
      const response = `
🌤 **Weather in ${name}, ${region}, ${country}:**
- **Temperature**: ${temperature}°C
- **Weather**: ${weather_descriptions[0]}
- **Humidity**: ${humidity}%
- **Wind Speed**: ${wind_speed} km/h
- **Feels Like**: ${feelslike}°C
      `;

      // Send the response back to the Discord channel
      message.channel.send(response);
    } catch (error) {
      // Log the error and notify the user
      console.error('Error fetching weather:', error);
      message.channel.send('An error occurred while fetching the weather. Please try again later.');
    }
  },
};