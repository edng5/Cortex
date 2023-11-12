const { Client, IntentsBitField } = require('discord.js');
require("dotenv").config();
const { OpenAI } = require("openai");
const { clearInterval } = require('timers');

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
  ]
})

client.on('ready', (c) => {
  console.log(`${c.user.tag} is online.`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if ((message.content.includes('cortex') || message.content.includes('Cortex')) && message.content.includes('generate image')){
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: message.content,
      n: 1,
      size: "1024x1024",
    }).catch((error) => console.error('OpenAI Error:\n', error));
    message.reply("Here you go!\n" + response.data[0].url);
    return;
  }

  if (message.content.includes('cortex') || message.content.includes('Cortex')) {
    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

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
      message.reply("I'm taking a nap, the noggin's foggy... Ask again later...");
      return;
    }
    if (response.choices[0].message.content.length > 2000){
      let long_message = response.choices[0].message.content.split(" ");
      let temp_message = ''
      for (let i = 0; i < long_message.length; i++){
        temp_message += long_message[i] + " ";
        if (temp_message.length > 1950){
          message.reply(temp_message);
          temp_message = ''
        }
      }
      message.reply(temp_message);
      return;
    }

    message.reply(response.choices[0].message.content);
  }
  return;
});

client.login(process.env.DISCORD_API_KEY);
