# Cortex Discord Bot (2023) by Edward Ng

Discord bot that replies as a conversational AI chatbot. Cortex is able to converse to the user and has the ability to answer simple questions with real-time information, play music, set reminders, and create polls.

Cortex uses the OpenAI GPT-3.5 API to generate conversations with memory of previous conversations. This persistent memory allows for in-depth conversation with Cortex. The user can also ask Cortex for an image search, which it does by scrapping Google Images based on the description provided. This process includes using Puppeteer to query the url with the provided prompt and return an image from the top 10 results. A function is also used to remove all stop words from the query to ensure a cleaner search for the image.

Uses Docker containers to deploy on Fly.io for constant up-time.

