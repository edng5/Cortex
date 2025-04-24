const { Client, IntentsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs'); // For reading command files
const muted = require('./commands/muted.js');
const pokeNewsRSS = require('./commands/PokeNewsRSS.js');
const slightlyDelayedDrops = require('./commands/SlightlyDelayedDrops.js'); // Import SlightlyDelayedDrops.js

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

  const args = message.content.split(' ');
  const commandName = args.shift().toLowerCase();

  if (client.commands.has(commandName)) {
    const command = client.commands.get(commandName);
    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`Error executing ${commandName}:`, error);
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
