const { Client, IntentsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs'); // For reading command files
const muted = require('./commands/muted.js');
const pokeNewsRSS = require('./commands/PokeNewsRSS.js');
const slightlyDelayedDrops = require('./commands/SlightlyDelayedDrops.js'); // Import SlightlyDelayedDrops.js
const cortexCommand = require('./commands/cortex.js'); // Import the Cortex command

// Initialize the bot
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates, // Required for monitoring voice states
  ],
});

// Track active conversations
const activeConversations = new Map(); // Map to track users Cortex is actively responding to

// Load commands dynamically from the commands folder
client.commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Event: Bot is ready
client.on('ready', () => {
  console.log(`${client.user.tag} is online.`);
  pokeNewsRSS.startPokeNewsFeed(client); // Start the PokeNews feed
  slightlyDelayedDrops.startMonitoring(client); // Start monitoring SlightlyDelayedDrops
});

// Event: Handle messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const content = message.content.toLowerCase();

  // Stop phrases to end the conversation
  const stopPhrases = ['stop cortex', 'bye cortex', 'leave me alone cortex', 'shut up cortex', 'thanks cortex'];

  // Check if the user wants to stop the conversation
  if (stopPhrases.some(phrase => content.includes(phrase))) {
    if (activeConversations.has(userId)) {
      activeConversations.delete(userId); // Remove the user from active conversations
      return message.reply('Alright, I’ll stop responding. Let me know if you need anything!');
    }
  }

  // Check if the message mentions "Cortex" (case-insensitive) or if the user is in an active conversation
  if (content.includes('cortex') || activeConversations.has(userId)) {
    // Add the user to active conversations if not already present
    if (!activeConversations.has(userId)) {
      activeConversations.set(userId, true);
    }

    // Extract arguments (if any) from the message
    const args = message.content.split(' ').slice(1);

    // Call the Cortex command logic
    await cortexCommand.execute(message, args);
    return; // Exit after handling the message
  }

  // Handle the !cortex command for one-time interaction
  if (message.content.startsWith('!cortex')) {
    const args = message.content.split(' ').slice(1);
    await cortexCommand.execute(message, args);
    return; // Do not add the user to active conversations
  }

  // Handle other commands
  const args = message.content.split(' ');
  const commandName = args.shift().toLowerCase();

  if (client.commands.has(commandName)) {
    const command = client.commands.get(commandName);
    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      message.reply('There was an error executing that command.');
    }
  }

  if (message.content.startsWith('!check_mute_time')) {
    const args = message.content.split(' ').slice(1);
    await muted.checkMuteTime(message, args);
  }

  if (message.content.startsWith('!check_muted')) {
    const args = message.content.split(' ').slice(1);
    await muted.checkMuted(message, args);
  }
});

// Event: Handle voice state updates
client.on('voiceStateUpdate', (oldState, newState) => {
  muted.handleVoiceStateUpdate(oldState, newState, client);
});

// Login to Discord
client.login(process.env.DISCORD_API_KEY);
