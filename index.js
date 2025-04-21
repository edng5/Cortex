const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
require("dotenv").config();
const { OpenAI } = require("openai");
const { scrapeImage } = require("./commands/imageScraper.js");
const schedule = require('node-schedule'); // Import node-schedule for scheduling tasks
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play = require('play-dl'); // For fetching audio streams
const fs = require('fs'); // Import the file system module
const axios = require('axios'); // For making API requests
const { getCode } = require('country-list'); // Import country-list for ISO code conversion

// Initialize OpenAI using API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mutedUsers = new Map(); // Tracks when a user mutes themselves
const dailyMuteTime = new Map(); // Tracks total mute time for each user in a day

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates, // Required for monitoring voice states
  ]
});

client.on('ready', (c) => {
  console.log(`${c.user.tag} is online.`);
});

// Function to send embedded logs
async function sendMuteLog(member, action, duration = null) {
  const logChannel = member.guild.channels.cache.find(channel => channel.name === 'mute-logs');
  if (!logChannel) return; // Exit if the log channel doesn't exist

  // Calculate cumulative mute time for the day
  const totalMuteTime = dailyMuteTime.get(member.id) || 0;

  const embed = new EmbedBuilder()
    .setColor(action === 'muted' ? 0xff0000 : 0x00ff00) // Red for mute, green for unmute
    .setTitle(`User ${action}`)
    .setDescription(`${member.user.tag} (${member.id})`)
    .setTimestamp();

  if (action === 'muted') {
    embed.addFields(
      { name: 'Action', value: 'Muted', inline: true },
      { name: 'Cumulative Mute Time Today', value: `${Math.floor(totalMuteTime / 1000)} seconds`, inline: true }
    );
  }

  if (action === 'unmuted' && duration !== null) {
    embed.addFields(
      { name: 'Action', value: 'Unmuted', inline: true },
      { name: 'Current Mute Duration', value: `${Math.floor(duration / 1000)} seconds`, inline: true },
      { name: 'Cumulative Mute Time Today', value: `${Math.floor(totalMuteTime / 1000)} seconds`, inline: true }
    );
  }

  await logChannel.send({ embeds: [embed] });
}

client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id;

  // Check if the user joined a voice channel
  if (!oldState.channelId && newState.channelId) {
    console.log(`${newState.member.user.tag} joined the voice channel.`);
  }

  // Check if the user is muted
  if (!oldState.selfMute && newState.selfMute) {
    mutedUsers.set(userId, Date.now());
    console.log(`${newState.member.user.tag} is now muted.`);

    // Send mute log
    await sendMuteLog(newState.member, 'muted');
  }

  // Check if the user is unmuted
  if (oldState.selfMute && !newState.selfMute) {
    if (mutedUsers.has(userId)) {
      const mutedDuration = Date.now() - mutedUsers.get(userId);
      mutedUsers.delete(userId);

      // Update the user's total mute time for the day
      const currentMuteTime = dailyMuteTime.get(userId) || 0;
      const updatedMuteTime = currentMuteTime + mutedDuration;
      dailyMuteTime.set(userId, updatedMuteTime);

      console.log(`${newState.member.user.tag} was muted for ${Math.floor(mutedDuration / 1000)} seconds.`);
      console.log(`Cumulative mute time for ${newState.member.user.tag}: ${Math.floor(updatedMuteTime / 1000)} seconds.`);

      // Send unmute log
      await sendMuteLog(newState.member, 'unmuted', mutedDuration);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  console.log('mutedUsers:', mutedUsers); // Debugging log to ensure mutedUsers is accessible

  if (message.content.includes('cortex') || message.content.includes('Cortex')){
    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

    if (message.content.includes('generate image') || message.content.includes('show picture') || message.content.includes('show image') ||
      message.content.includes('generate picture') || message.content.includes('show me')){
      const image_query = message.content
      if (!image_query) return message.channel.send("Sorry I can't find what you are looking for.");
      message.channel.send("Sure! Here you go!");
      message.channel.send(await scrapeImage(image_query));
      clearInterval(sendTypingInterval);
      return;
    }

// if (message.content.includes('make announcement') || message.content.includes('set reminder')){
    //   let seconds, event = scheduleParser(message.content)
    // }
    
    let conversation = [];
    conversation.push({"role": "system", "content": 'Chat GPT is a friendly chatbot named Cortex'});

    let prevMessages = await message.channel.messages.fetch({ limit: 10});
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
      const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

      if (msg.author.id === client.user.id){
        conversation.push({ role: 'assistant', name: username, content: msg.content});

        return;
      }

      conversation.push({role: 'user', name: username, content: msg.content,})
    })

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversation,
    }).catch((error) => console.error('OpenAI Error:\n', error));

    clearInterval(sendTypingInterval);

    if (!response) {
      message.channel.send("I'm taking a nap, the noggin's foggy... Ask again later...");
      return;
    }
    if (response.choices[0].message.content.length > 2000){
      let long_message = response.choices[0].message.content.split(" ");
      let temp_message = ''
      for (let i = 0; i < long_message.length; i++){
        temp_message += long_message[i] + " ";
        if (temp_message.length > 1950){
          message.channel.send(temp_message);
          temp_message = ''
        }
      }
      message.channel.send(temp_message);
      return;
    }
    message.channel.send(response.choices[0].message.content);
  }

  // Command to check total mute time for the day
  if (message.content.startsWith('!check_mute_time')) {
    const args = message.content.split(' ');
    const username = args[1];

    if (!username) {
      return message.channel.send('Please specify a username. Usage: `!check_mute_time <username>`');
    }

    const member = message.guild.members.cache.find(m => m.user.username === username);
    if (!member) {
      return message.channel.send(`User ${username} not found.`);
    }

    const totalMuteTime = dailyMuteTime.get(member.id) || 0;
    return message.channel.send(`${username} has been muted for a total of ${Math.floor(totalMuteTime / 1000)} seconds today.`);
  }

  // Command to check current mute duration
  if (message.content.startsWith('!check_muted')) {
    const args = message.content.split(' ');
    const username = args[1];

    if (!username) {
      return message.channel.send('Please specify a username. Usage: `!check_muted <username>`');
    }

    const member = message.guild.members.cache.find(m => m.user.username === username);
    if (!member) {
      return message.channel.send(`User ${username} not found.`);
    }

    if (mutedUsers.has(member.id)) {
      const mutedDuration = Date.now() - mutedUsers.get(member.id);
      return message.channel.send(`${username} has been muted for ${Math.floor(mutedDuration / 1000)} seconds.`);
    } else {
      return message.channel.send(`${username} is not currently muted.`);
    }
  }

  return;
});

// Function to parse and schedule reminders
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!set_reminder')) {
    const args = message.content.split(' ').slice(1).join(' ');

    if (!args) {
      return message.channel.send('Please specify the date, time, and reminder message. Usage: `!set_reminder <date/time> - <message> [-e]`');
    }

    // Extract date/time, reminder message, and optional @everyone flag
    const match = args.match(/^(.*?)(?:\s-\s)(.+?)(?:\s-\s-e)?$/);
    if (!match) {
      return message.channel.send('Invalid format. Use: `!set_reminder <date/time> - <message> [-e]`');
    }

    const dateTimeInput = match[1];
    let reminderMessage = match[2];
    const mentionEveryone = args.endsWith('-e'); // Check if the command ends with `-e`

    // Remove the `-e` flag from the message if present
    if (mentionEveryone) {
      reminderMessage = reminderMessage.replace(/\s-\s-e$/, '');
    }

    // Parse the date and time
    const reminderDate = new Date(dateTimeInput);
    if (isNaN(reminderDate)) {
      return message.channel.send('Invalid date/time format. Please try again.');
    }

    // Schedule the reminder
    schedule.scheduleJob(reminderDate, () => {
      const reminderText = mentionEveryone
        ? `@everyone ⏰ Reminder: ${reminderMessage}`
        : `⏰ Reminder: ${reminderMessage}`;
      message.channel.send(reminderText);
    });

    return message.channel.send(`Reminder set for ${reminderDate.toLocaleString()}: "${reminderMessage}"${mentionEveryone ? ' (🚨)' : ''}`);
  }
});

// Function to play music
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!play_music')) {
    const args = message.content.split(' ').slice(1).join(' ');

    if (!args) {
      return message.channel.send('Please specify the song title and artist. Usage: `!play_music <title> - <artist>`');
    }

    // Extract title and artist
    const match = args.match(/^(.*?)(?:\s-\s)(.+)$/);
    if (!match) {
      return message.channel.send('Invalid format. Use: `!play_music <title> - <artist>`');
    }

    const title = match[1];
    const artist = match[2];

    // Check if the user is in a voice channel
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send('You need to be in a voice channel to play music!');
    }

    try {
      // Search for the song on YouTube
      const searchQuery = `${title} ${artist}`;
      const searchResults = await play.search(searchQuery, { limit: 1 });
      if (searchResults.length === 0) {
        return message.channel.send('No results found for the specified song.');
      }

      const song = searchResults[0];
      const stream = await play.stream(song.url);

      // Join the voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      // Handle connection state changes
      connection.on(VoiceConnectionStatus.Ready, () => {
        console.log('The bot is connected to the voice channel!');
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          connection.destroy();
        }
      });

      // Create an audio player and play the song
      const player = createAudioPlayer();
      const resource = createAudioResource(stream.stream, { inputType: stream.type });

      player.play(resource);
      connection.subscribe(player);

      message.channel.send(`🎵 Now playing: **${song.title}** by **${artist}**`);

      // Handle player events
      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy(); // Leave the voice channel when the song ends
        console.log('The bot has left the voice channel.');
      });

      player.on('error', (error) => {
        console.error('Error playing audio:', error);
        message.channel.send('An error occurred while playing the song.');
        connection.destroy();
      });
    } catch (error) {
      console.error('Error fetching or playing music:', error);
      message.channel.send('An error occurred while trying to play the song.');
    }
  }
});

// Function to find YouTube videos
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!find_video')) {
    const query = message.content.split(' ').slice(1).join(' ');

    if (!query) {
      return message.channel.send('Please provide a search query. Usage: `!find_video <search query>`');
    }

    try {
      // Search for YouTube videos using play-dl
      const searchResults = await play.search(query, { limit: 5 }); // Limit to 5 results
      if (searchResults.length === 0) {
        return message.channel.send('No videos found for the given query.');
      }

      // Format the results into a message
      let response = '🎥 **Top YouTube Results:**\n';
      searchResults.forEach((video, index) => {
        response += `${index + 1}. [${video.title}](${video.url})\n`;
      });

      return message.channel.send(response);
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      return message.channel.send('An error occurred while searching for videos. Please try again later.');
    }
  }
});

// Function to find a song based on lyrics
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!find_song')) {
    const lyrics = message.content.split(' ').slice(1).join(' ');

    if (!lyrics) {
      return message.channel.send('Please provide some lyrics to search for. Usage: `!find_song <lyrics>`');
    }

    try {
      // Replace 'YOUR_GENIUS_API_KEY' with your Genius API key
      const apiKey = process.env.GENIUS_API_KEY;
      const response = await axios.get('https://api.genius.com/search', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        params: {
          q: lyrics,
        },
      });

      const hits = response.data.response.hits;

      if (hits.length === 0) {
        return message.channel.send('No songs found matching those lyrics.');
      }

      const song = hits[0].result;
      const songTitle = song.title;
      const songArtist = song.primary_artist.name;
      const songUrl = song.url;

      return message.channel.send(`🎵 Found a song: **${songTitle}** by **${songArtist}**\nMore info: ${songUrl}`);
    } catch (error) {
      console.error('Error fetching song from Genius API:', error);
      return message.channel.send('An error occurred while searching for the song. Please try again later.');
    }
  }
});

// Function to fetch top news and weather
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!news')) {
    const args = message.content.split(' ').slice(1);
    const category = args[0]?.toLowerCase(); // e.g., politics, stock, sports, science, technology, weather
    let location = args.slice(1).join(' '); // e.g., "Canada"

    if (!category) {
      return message.channel.send('Please specify a category. Usage: `!news <category> [location]`');
    }

    try {
      let responseMessage = '';

      // Convert location to ISO code if it's not empty and longer than 2 characters
      if (category !== 'weather' && location && location.length > 2) {
        const isoCode = getCode(location);
        if (!isoCode) {
          return message.channel.send(`Unable to find ISO code for the location: **${location}**. Please check the location and try again.`);
        }
        location = isoCode.toLowerCase(); // Convert ISO code to lowercase for NewsAPI
      }

      // Fetch news headlines
      if (category !== 'weather') {
        const newsApiKey = process.env.NEWS_API_KEY; // Replace with your NewsAPI key
        const newsParams = {
          category: category,
          apiKey: newsApiKey,
        };

        // If a location is provided, add the country parameter
        if (location) {
          newsParams.country = location; // Use the ISO code for location
        }

        const newsResponse = await axios.get('https://newsapi.org/v2/top-headlines', { params: newsParams });

        const articles = newsResponse.data.articles.slice(0, 5); // Get top 5 articles
        if (articles.length === 0) {
          responseMessage += `No news found for category **${category}** in **${location || 'Global'}**.\n`;
        } else {
          responseMessage += `📰 **Top News in ${category} (${location || 'Global'}):**\n`;
          articles.forEach((article, index) => {
            responseMessage += `${index + 1}. [${article.title}](${article.url})\n`;
          });
        }
      }

      // Fetch weather information
      if (category === 'weather') {
        const weatherApiKey = process.env.WEATHER_API_KEY; // Replace with your Weatherstack API key
        const weatherResponse = await axios.get('http://api.weatherstack.com/current', {
          params: {
            access_key: weatherApiKey,
            query: location || 'Toronto', // Default to Toronto if no location is provided
          },
        });

        const weatherData = weatherResponse.data;

        if (weatherData.error) {
          responseMessage += `\n🌤 Unable to fetch weather for **${location || 'default region'}**. Please check the location and try again.\n`;
        } else {
          responseMessage += `\n🌤 **Weather in ${weatherData.location.name}, ${weatherData.location.region}, ${weatherData.location.country}:**\n`;
          responseMessage += `- Temperature: ${weatherData.current.temperature}°C\n`;
          responseMessage += `- Weather: ${weatherData.current.weather_descriptions[0]}\n`;
          responseMessage += `- Humidity: ${weatherData.current.humidity}%\n`;
          responseMessage += `- Wind Speed: ${weatherData.current.wind_speed} km/h\n`;
          responseMessage += `- Feels Like: ${weatherData.current.feelslike}°C\n`;
        }
      }

      return message.channel.send(responseMessage);
    } catch (error) {
      console.error('Error fetching news or weather:', error);
      return message.channel.send('An error occurred while fetching the news or weather. Please try again later.');
    }
  }
});

// Command to list all available commands
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!help')) {
    try {
      // Read the contents of command-list.txt
      const commandsList = fs.readFileSync('./command-list.txt', 'utf8');
      return message.channel.send(commandsList);
    } catch (error) {
      console.error('Error reading command-list.txt:', error);
      return message.channel.send('An error occurred while fetching the command list. Please try again later.');
    }
  }
});

client.login(process.env.DISCORD_API_KEY);
