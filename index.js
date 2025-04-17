const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
require("dotenv").config();
const { OpenAI } = require("openai");
const { scrapeImage } = require("./commands/imageScraper.js");
const schedule = require('node-schedule'); // Import node-schedule for scheduling tasks

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
      return message.channel.send('Please specify the date, time, and reminder message. Usage: `!set_reminder <date/time> <message>`');
    }

    // Extract date/time and reminder message
    const match = args.match(/^(.*?)(?:\s-\s)(.+)$/);
    if (!match) {
      return message.channel.send('Invalid format. Use: `!set_reminder <date/time> - <message>`');
    }

    const dateTimeInput = match[1];
    const reminderMessage = match[2];

    // Parse the date and time
    const reminderDate = new Date(dateTimeInput);
    if (isNaN(reminderDate)) {
      return message.channel.send('Invalid date/time format. Please try again.');
    }

    // Schedule the reminder
    schedule.scheduleJob(reminderDate, () => {
      message.channel.send(`⏰ Reminder: ${reminderMessage}`);
    });

    return message.channel.send(`Reminder set for ${reminderDate.toLocaleString()}: "${reminderMessage}"`);
  }
});

client.login(process.env.DISCORD_API_KEY);
