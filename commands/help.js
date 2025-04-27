/**
 * This module provides a help command that lists all available commands or detailed information about a specific command.
 */

const fs = require('fs'); // For reading the command-list.txt file

module.exports = {
  name: '!help', // Command name to trigger this functionality
  description: 'Lists all available commands or detailed information about a specific command.',

  /**
   * Executes the !help command.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command. 
   *                       args[0] is the optional command name for detailed information.
   */
  async execute(message, args) {
    try {
      // If a specific command is requested, provide detailed information
      if (args.length > 0) {
        const commandName = args[0].toLowerCase();

        // Detailed information for each command
        const commandDetails = {
          '!set_reminder': `
            **!set_reminder**
            - Sets a reminder for a specific date and time.
            - **Usage**: \`!set_reminder <date/time> - <message> [-e]\`
            - **Example**: 
            - \`!set_reminder 2025-04-18 14:30 - Attend the meeting\`
            - \`!set_reminder 2025-04-18 14:30 - Attend the meeting -e\` (mentions @everyone)
          `,
          '!play_music': `
            **!play_music**
            - Plays a song in the user's current voice channel based on the provided title and artist.
            - **Usage**: \`!play_music <title> - <artist>\`
            - **Example**: \`!play_music Shape of You - Ed Sheeran\`
          `,
          '!find_video': `
            **!find_video**
            - Searches YouTube for videos based on a query and returns the top 5 results.
            - **Usage**: \`!find_video <search query>\`
            - **Example**: \`!find_video lo-fi beats\`
          `,
          '!find_song': `
            **!find_song**
            - Finds a song based on provided lyrics.
            - **Usage**: \`!find_song <lyrics>\`
            - **Example**: \`!find_song I got a feeling that tonight's gonna be a good night\`
          `,
          '!check_mute_time': `
            **!check_mute_time**
            - Checks the total mute time for a user for the current day.
            - **Usage**: \`!check_mute_time <username>\`
            - **Example**: \`!check_mute_time JohnDoe\`
          `,
          '!check_muted': `
            **!check_muted**
            - Checks if a user is currently muted and for how long.
            - **Usage**: \`!check_muted <username>\`
            - **Example**: \`!check_muted JohnDoe\`
          `,
          '!news': `
            **!news**
            - Fetches top news headlines or weather information based on the specified category and location.
            - **Categories**: \`business\`, \`entertainment\`, \`general\`, \`health\`, \`science\`, \`sports\`, \`technology\`, \`weather\`
            - **Usage**: \`!news <category> [location]\`
            - **Examples**:
            - \`!news sports Canada\` (Fetches sports news for Canada)
            - \`!news technology\` (Fetches global technology news)
            - \`!news weather Toronto\` (Fetches weather information for Toronto)
          `,
          '!weather': `
            **!weather**
            - Fetches the current weather for a specified location.
            - **Usage**: \`!weather <location>\`
            - **Example**: \`!weather New York\`
          `,
          '!pokemon_card': `
            **!pokemon_card**
            - Analyzes Pokémon card price trends and predicts future prices.
            - **Usage**: \`!pokemon_card <card name> <card number>\`
            - **Example**: \`!pokemon_card Charizard EX 223\`
          `,
          '!stock': `
            **!stock**
            - Analyzes stock data and provides insights.
            - **Usage**: \`!stock <symbol>\`
            - **Example**: \`!stock AAPL\`
          `,
        };

        // Check if the requested command exists
        if (commandDetails[commandName]) {
          return message.channel.send(commandDetails[commandName]);
        } else {
          return message.channel.send(`Command **${commandName}** not found. Use \`!help\` to see the list of available commands.`);
        }
      }

      // If no specific command is requested, list all available commands
      const commandList = fs.readFileSync('./command-list.txt', 'utf8');
      message.channel.send(commandList);
    } catch (error) {
      // Log the error and notify the user
      console.error('Error reading command-list.txt:', error);
      message.channel.send('An error occurred while fetching the command list. Please try again later.');
    }
  },
};