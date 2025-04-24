const RSSParser = require('rss-parser');
const parser = new RSSParser();

const sentPosts = new Set(); // Tracks already sent posts

/**
 * Continuously checks the RSS feed and sends new posts to the PokeNews channel.
 * 
 * @param {Object} client - The Discord client instance.
 */
async function startPokeNewsFeed(client) {
  const channelName = 'pokenews';

  // Find the existing PokeNews channel
  const newsChannel = client.channels.cache.find(channel => channel.name === channelName && channel.type === 0); // 0 = text channel
  if (!newsChannel) {
    console.error(`Channel "${channelName}" not found. Please create it manually.`);
    return;
  }

  console.log(`PokeNews channel ready: ${newsChannel.name}`);

  // Function to fetch and send new posts
  async function fetchAndSendNews() {
    try {
      const feed = await parser.parseURL('https://www.pokebeach.com/forums/forum/-/index.rss');
      for (const item of feed.items) {
        if (!sentPosts.has(item.link)) {
          // Extract image URL if available
          const imageUrl = item.enclosure?.url || null; // Check if the feed item has an enclosure with a URL

          // Create the message content
          let messageContent = `**${item.title}**\n${item.link}`;
          if (imageUrl) {
            messageContent += `\n${imageUrl}`; // Append the image URL if available
          }

          // Send the new post to the channel
          await newsChannel.send(messageContent);
          sentPosts.add(item.link); // Mark the post as sent
        }
      }
    } catch (error) {
      console.error('Error fetching PokeNews RSS feed:', error);
    }
  }

  // Run the function every 5 minutes
  setInterval(fetchAndSendNews, 5 * 60 * 1000);

  // Fetch news immediately on startup
  fetchAndSendNews();
}

module.exports = {
  startPokeNewsFeed, // Export the function
};