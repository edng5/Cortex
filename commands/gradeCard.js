const axios = require('axios');
const sharp = require('sharp'); // Import sharp
const {Jimp, diff} = require('jimp'); // Import Jimp
const fs = require('fs');
const cheerio = require('cheerio'); // Import cheerio for web scraping

// TODO: preprocess the input images by cropping and rotating to match the official card image. Properly scrape the PSA prices from PriceCharting.com.

module.exports = {
  name: '!grade_card',
  description: 'Grades a Pokémon card based on provided images.',
  async execute(message, args) {
    console.log('Executing !grade_card command...');
    if (message.attachments.size !== 2) {
      console.log('Incorrect number of attachments provided.');
      return message.reply('Please attach exactly 2 images: the front and back of the card.');
    }

    const attachments = Array.from(message.attachments.values());
    const frontImageUrl = attachments[0].url;
    const backImageUrl = attachments[1].url;

    console.log('Front image URL:', frontImageUrl);
    console.log('Back image URL:', backImageUrl);

    if (args.length < 2) {
      console.log('Insufficient arguments provided for the !grade_card command.');
      return message.reply('Usage: !grade_card <name of card> <number of card> and attach 2 images.');
    }

    const cardName = args.slice(0, -1).join(' ');
    const cardNumber = args[args.length - 1];

    console.log('Card name:', cardName);
    console.log('Card number:', cardNumber);

    // try {
      const apiUrl = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(cardName)}" number:${encodeURIComponent(cardNumber)}`;
      console.log('Fetching card data from API:', apiUrl);

      const response = await axios.get(apiUrl);
      console.log('API response received.');

      if (!response.data.data || response.data.data.length === 0) {
        console.log('Card not found in the Pokémon TCG database.');
        return message.reply('Card not found in the Pokémon TCG database.');
      }

      const cardData = response.data.data[0];
      const officialCardName = cardData.name + ' ' + cardData.number;
      const officialFrontImageUrl = cardData.images.large;

      console.log('Official front image URL:', officialFrontImageUrl);

      if (!officialFrontImageUrl) {
        throw new Error('Official front image URL is missing or invalid.');
      }

      console.log('Fetching dimensions of the official front image...');
      const officialImageMetadata = await getImageMetadata(officialFrontImageUrl);
      console.log('Official front image dimensions:', officialImageMetadata);

      console.log('Downloading and preprocessing images...');
      const [frontImage, backImage, officialFrontImage] = await Promise.all([
        downloadAndProcessImage(frontImageUrl, officialImageMetadata),
        downloadAndProcessImage(backImageUrl, officialImageMetadata),
        downloadAndProcessImage(officialFrontImageUrl, officialImageMetadata),
      ]);

      console.log('Images successfully downloaded and resized.');

      console.log('Comparing front image...');
      const frontMatch = await compareImages(frontImage, officialFrontImage);
      console.log(`Front image match: ${frontMatch}%`);

      console.log('Comparing back image...');
      const backMatch = await compareImages(backImage, await getBackCardTemplate(officialImageMetadata));
      console.log(`Back image match: ${backMatch}%`);

      const percentMatch = ((frontMatch + backMatch) / 2).toFixed(2);
      const finalGrade = (Math.floor(((frontMatch + backMatch) / 2 / 10) * 2) / 2).toFixed(1);
      console.log(`Final grade calculated: ${percentMatch}%`);

      console.log('Fetching PSA price data...');
      const { ungradedPrice, gradedPrice } = await scrapePSAPrice(officialCardName, finalGrade);

      return message.reply(
        `Your "**${officialCardName}**" has been graded: **PSA ${finalGrade}**.\n` +
        `Ungraded value: **${ungradedPrice}**.\n` +
        `Estimated value (PSA ${finalGrade}): **${gradedPrice}**.`
      );
    // } catch (error) {
    //   console.error('Error grading card:', error.message);
    //   return message.reply('An error occurred while grading the card. Please try again.');
    // }
  },
};

// Helper function: Get image metadata using sharp
async function getImageMetadata(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const metadata = await sharp(response.data).metadata();
  return { width: metadata.width, height: metadata.height };
}

// Helper function: Download and process image using sharp and Jimp
async function downloadAndProcessImage(url, targetDimensions) {
  console.log(`Downloading image from URL: ${url}`);
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  console.log('Image downloaded. Resizing with sharp...');

  // Resize the image using sharp to match the dimensions of the official front image
  const resizedBuffer = await sharp(response.data)
    .resize(targetDimensions.width, targetDimensions.height) // Resize to match official image dimensions
    .toBuffer();

  console.log('Image resized successfully. Processing with Jimp...');

  // Process the resized image with Jimp
  const image = await Jimp.read(resizedBuffer);
  image.greyscale(); // Convert to grayscale
  console.log('Image processed successfully with Jimp.');

  // Return the processed image object
  return image;
}

// Helper function: Get back card template (English Pokémon card back)
async function getBackCardTemplate(targetDimensions) {
  console.log('Loading back card template...');
  const backCardUrl = './assets/english_card_back.png';

  // Resize the back card template using sharp to match the dimensions of the official front image
  const resizedBuffer = await sharp(backCardUrl)
    .resize(targetDimensions.width, targetDimensions.height) // Resize to match official image dimensions
    .toBuffer();

  console.log('Back card template resized successfully. Processing with Jimp...');

  // Process the resized back card template with Jimp
  const backCardImage = await Jimp.read(resizedBuffer);
  backCardImage.greyscale(); // Convert to grayscale
  console.log('Back card template processed successfully with Jimp.');

  // Return the processed back card image object
  return backCardImage;
}

// Helper function: Compare two images using Jimp
async function compareImages(image1, image2) {
  console.log('Comparing images using Jimp...');

  // Ensure both images have the same dimensions
  if (image1.bitmap.width !== image2.bitmap.width || image1.bitmap.height !== image2.bitmap.height) {
    throw new Error('Images must have the same dimensions for comparison.');
  }

  // Use Jimp.diff to compare the images
  const img_diff = diff(image1, image2, 0.1); // Threshold of 0.1
  console.log(`Percent Difference: ${(img_diff.percent * 100).toFixed(2)}%`);

  // Calculate similarity as a percentage
  const similarity = 1 - img_diff.percent;
  console.log(`Image similarity: ${(similarity * 100).toFixed(2)}%`);
  return similarity * 100; // Convert to percentage
}

// Helper function: Scrape PSA prices from PriceCharting.com
async function scrapePSAPrice(cardName, grade) {
  try {
    const searchUrl = `https://www.pricecharting.com/search-products?type=prices&q=${encodeURIComponent(cardName)}#full-prices`;
    console.log(`Scraping PSA prices from URL: ${searchUrl}`);

    const response = await axios.get(searchUrl);
    const $ = cheerio.load(response.data);

    // Find the ungraded price
    const ungradedPriceElement = $('#full-prices tr')
      .filter((_, el) => $(el).find('td').first().text().trim() === 'Ungraded')
      .find('.price.js-price');
    const ungradedPrice = ungradedPriceElement.length > 0 ? ungradedPriceElement.text().trim() : 'N/A';

    // Normalize the grade for matching (remove decimals for whole numbers like 8.0, 9.0)
    const normalizedGrade = grade.includes('.') ? grade : `${grade}.0`;

    // Find the price for the specific grade
    let gradedPrice = 'N/A';
    if (grade === '10') {
      const psa10PriceElement = $('#full-prices tr')
        .filter((_, el) => $(el).find('td').first().text().trim() === 'PSA 10')
        .find('.price.js-price');
      gradedPrice = psa10PriceElement.length > 0 ? psa10PriceElement.text().trim() : 'N/A';
    } else {
      const gradePriceElement = $('#full-prices tr')
        .filter((_, el) => $(el).find('td').first().text().trim() === `Grade ${normalizedGrade}`)
        .find('.price.js-price');
      gradedPrice = gradePriceElement.length > 0 ? gradePriceElement.text().trim() : 'N/A';
    }

    console.log(`Scraped ungraded price: ${ungradedPrice}`);
    console.log(`Scraped PSA ${grade} price: ${gradedPrice}`);

    return { ungradedPrice, gradedPrice };
  } catch (error) {
    console.error('Error scraping PSA prices:', error.message);
    return { ungradedPrice: 'N/A', gradedPrice: 'N/A' };
  }
}