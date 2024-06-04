// var Scraper = require('images-scraper');
const puppeteer = require('puppeteer');

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

async function scrapeImage(query) {
  // Launch Puppeteer browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Format query for URL
  query = remove_stopwords(query)
  const searchQuery = query.split(' ').join('+');
  
  // Go to Google Images
  const url = `https://www.google.com/search?hl=en&tbm=isch&q=${searchQuery}`;
  await page.goto(url, { waitUntil: 'load', timeout: 0 });

  // Scroll to load more images
  const scrollToBottom = async () => {
    await page.evaluate(async () => {
      const distance = 100; // Should be less than or equal to window.innerHeight
      const delay = 100;
      let loadedImages = document.querySelectorAll('img').length;
      while (document.scrollingElement.scrollTop + window.innerHeight < document.scrollingElement.scrollHeight && loadedImages < 300) {
        document.scrollingElement.scrollTop += distance;
        await new Promise(resolve => setTimeout(resolve, delay));
        loadedImages = document.querySelectorAll('img').length;
      }
    });
  };

  await scrollToBottom();

  // Extract image URLs
  const imageUrls = await page.evaluate(() => {
    const imgElements = document.querySelectorAll('img');
    const urls = Array.from(imgElements).map(img => img.src);
    return urls;
  });

  // Close the browser
  await browser.close();

  // Filter only HTTPS URLs
  const httpsUrls = imageUrls.filter(url => url.startsWith('https'));
  const trimmedUrls = httpsUrls.slice(3);

  // Randomly select one URL from the filtered list
  const randomIndex = Math.floor(Math.random() * 10);
  const randomImageUrl = trimmedUrls[randomIndex];

  if (randomImageUrl) {
    return randomImageUrl;
  }
  else {
    return "https://lh6.googleusercontent.com/Bu-pRqU_tWZV7O3rJ5nV1P6NjqFnnAs8kVLC5VGz_Kf7ws0nDUXoGTc7pP87tyUCfu8VyXi0YviIm7CxAISDr2lJSwWwXQxxz98qxVfMcKTJfLPqbcfhn-QEeOowjrlwX1LYDFJN"
  }
}

module.exports = {
  scrapeImage
};
