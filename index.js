const { Client, IntentsBitField } = require('discord.js');
require("dotenv").config();
const { OpenAI } = require("openai");
const { scrapeImage } = require("./commands/imageScraper.js")

// Initialize OpenAI using API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates, // Required for monitoring voice states
  ]
})

client.on('ready', (c) => {
  console.log(`${c.user.tag} is online.`);
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.id;

  // Check if the user joined a voice channel
  if (!oldState.channelId && newState.channelId) {
    console.log(`${newState.member.user.tag} joined the voice channel.`);
  }

  // Check if the user is muted
  if (!oldState.selfMute && newState.selfMute) {
    mutedUsers.set(userId, Date.now());
    console.log(`${newState.member.user.tag} is now muted.`);
  }

  // Check if the user is unmuted
  if (oldState.selfMute && !newState.selfMute) {
    if (mutedUsers.has(userId)) {
      const mutedDuration = Date.now() - mutedUsers.get(userId);
      mutedUsers.delete(userId);
      console.log(`${newState.member.user.tag} was muted for ${Math.floor(mutedDuration / 1000)} seconds.`);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

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

  // Command to check muted duration
  if (message.content.startsWith('check_muted')) {
    const args = message.content.split(' ');
    const username = args[1];

    if (!username) {
      return message.channel.send('Please specify a username. Usage: `check_muted <username>`');
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

client.login(process.env.DISCORD_API_KEY);
