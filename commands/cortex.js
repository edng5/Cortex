require("dotenv").config();
const { OpenAI } = require("openai");
const { scrapeImage } = require("./imageScraper.js"); // Import the image scraper

// Initialize OpenAI using API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calls the OpenAI API to generate a response based on the conversation.
 * 
 * @param {Array} conversation - The conversation history, including user and assistant messages.
 * @returns {Object} - The response from OpenAI.
 */
const callOpenAPI = async (conversation) => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: conversation,
  }).catch((error) => console.error('OpenAI Error:\n', error));
  return response;
};

module.exports = {
  name: '!cortex', // Command name to trigger this functionality
  description: 'Interacts with Cortex, the AI chatbot.',
  
  /**
   * Executes the !cortex command.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command.
   */
  async execute(message, args) {
    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

    try {
      // Check if the message is requesting an image
      if (message.content.includes('generate image') || message.content.includes('show picture') || message.content.includes('show image') ||
          message.content.includes('generate picture') || message.content.includes('show me')) {
        const imageQuery = args.join(' '); // Combine arguments into a single query
        if (!imageQuery) {
          return message.channel.send("Sorry, I can't find what you are looking for.");
        }

        message.channel.send("Sure! Here you go!");
        const imageUrl = await scrapeImage(imageQuery); // Fetch the image URL
        clearInterval(sendTypingInterval);
        return message.channel.send(imageUrl); // Send the image URL
      }

      // Prepare the conversation history
      let conversation = [];
      conversation.push({ role: "system", content: "Chat GPT is a friendly chatbot named Cortex" });

      const prevMessages = await message.channel.messages.fetch({ limit: 10 });
      prevMessages.reverse();

      prevMessages.forEach((msg) => {
        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        if (msg.author.id === message.client.user.id) {
          conversation.push({ role: 'assistant', name: username, content: msg.content });
        } else {
          conversation.push({ role: 'user', name: username, content: msg.content });
        }
      });

      // Call OpenAI API
      const response = await callOpenAPI(conversation);

      clearInterval(sendTypingInterval);

      if (!response) {
        return message.channel.send("I'm taking a nap, the noggin's foggy... Ask again later...");
      }

      const content = response.choices[0].message.content;

      // Handle long responses
      if (content.length > 2000) {
        const chunks = content.match(/[\s\S]{1,1950}/g); // Split into chunks of 1950 characters
        for (const chunk of chunks) {
          await message.channel.send(chunk);
        }
      } else {
        await message.channel.send(content);
      }
    } catch (error) {
      console.error('Error in Cortex command:', error);
      message.channel.send('An error occurred while processing your request. Please try again later.');
    } finally {
      clearInterval(sendTypingInterval);
    }
  },
};