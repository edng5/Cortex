require("dotenv").config();
const { OpenAI } = require("openai");

// Initialize OpenAI using API Key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });


var callOpenAPI = async (conversation) => {
    const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: conversation,
    }).catch((error) => console.error('OpenAI Error:\n', error));
    return response
}


module.exports = {
    callOpenAPI
};