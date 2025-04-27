const { Client, IntentsBitField } = require('discord.js');
require('dotenv').config();

const BOT_TOKEN = process.env.DISCORD_API_KEY; // Discord bot token

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
});

// Log in the bot
client.once('ready', () => {
  console.log(`${client.user.tag} is online and monitoring Threads.`);
  startMonitoring(client); // Start monitoring Threads
});

client.login(BOT_TOKEN);

const puppeteer = require('puppeteer');

async function startMonitoring(client) {
  const THREADS_URL = 'https://www.threads.net/@celadonca';
  let lastPostUrl = null; // Tracks the last sent post URL

  async function scrapeLatestPost() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(THREADS_URL, { waitUntil: 'networkidle2', timeout: 30000 }); // Set a timeout of 30 seconds

      // Wait for the first post to load
      await page.waitForSelector('a[href^="/@celadonca/post/"]', { timeout: 10000 }); // Set a timeout for the selector

      // Extract the first post URL
      const postUrl = await page.$eval('a[href^="/@celadonca/post/"]', (link) => link.href);

      await browser.close();
      return postUrl;
    } catch (error) {
      console.error('Error scraping Threads page:', error.message);

      // Close the browser in case of an error
      await browser.close();

      // Return null to indicate failure
      return null;
    }
  }

  async function checkForNewPosts() {
    try {
      const latestPostUrl = await scrapeLatestPost();

      if (!latestPostUrl) {
        console.log('No post found or failed to scrape.');
        return;
      }

      if (latestPostUrl !== lastPostUrl) {
        lastPostUrl = latestPostUrl; // Update the last seen post URL

        const guild = client.guilds.cache.first(); // Get the first guild the bot is in
        if (!guild) {
          console.error('No guild found for the bot.');
          return;
        }

        const channel = guild.channels.cache.find(
          (ch) => ch.name === 'slightlydelayeddrops' && ch.type === 0 // 0 = text channel
        );

        if (!channel) {
          console.error('Channel "slightlydelayeddrops" not found. Please create it manually.');
          return;
        }

        await channel.send(`New post: ${latestPostUrl}`);
        console.log(`Posted new thread: ${latestPostUrl}`);
      } else {
        console.log('No new posts.');
      }
    } catch (error) {
      console.error('Error checking for new posts:', error);
    }
  }

  setInterval(checkForNewPosts, 5 * 60 * 1000); // Schedule the function to run every 5 minutes
  checkForNewPosts(); // Run immediately on startup
}

module.exports = {
  startMonitoring, // Export the function
};