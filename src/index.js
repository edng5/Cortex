const { Client, IntentsBitField } = require('discord.js');
require("dotenv").config();
const { OpenAI } = require("openai");
const { clearInterval } = require('timers');

var Scraper = require('images-scraper');

const images_scraper = new Scraper({
  puppeteer: {
    headless: true,
  },
});

const stopwords = ['cortex','image','show','generate','i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now'] 

function remove_stopwords(str) {
  res = []
  words = str.split(' ')
  for(i=0;i<words.length;i++) {
     word_clean = words[i].split(".").join("")
     if(!stopwords.includes(word_clean)) {
         res.push(word_clean)
     }
  }
  return(res.join(' '))
}  

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

  if (message.content.includes('cortex') || message.content.includes('Cortex')){
    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

    if (message.content.includes('generate image') || message.content.includes('show picture') || message.content.includes('show image') ||
      message.content.includes('generate picture') || message.content.includes('show me')){
      const image_query = message.content
      if (!image_query) return message.channel.send("Sorry I can't find what you are looking for.");
      message.content = remove_stopwords(message.content)
      let i = 10
      const image_results = await images_scraper.scrape(message.content, i);
      let x = parseInt(Math.random() * (i - 1));
      message.channel.send("Sure! Here you go!");
      message.channel.send(image_results[x].url);
      clearInterval(sendTypingInterval);
      return;
    }
    
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
  return;
});

client.login(process.env.DISCORD_API_KEY);
