const axios = require('axios');
const cheerio = require('cheerio');
const { startBot, sendMessage } = require('./bot');


//const PAGE_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html?locationIdentifier=REGION%5E94019&minBedrooms=1&maxPrice=900&propertyTypes=&maxDaysSinceAdded=1&mustHave=&dontShow=&furnishTypes=furnished';
//const PAGE_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html?locationIdentifier=REGION%5E94019&minBedrooms=1&maxPrice=900&radius=0.25&propertyTypes=&maxDaysSinceAdded=1&mustHave=&dontShow=&furnishTypes=furnished&keywords=';
//const PAGE_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html?locationIdentifier=REGION%5E94019&minBedrooms=2&maxPrice=1300&radius=0.25&propertyTypes=flat&maxDaysSinceAdded=1&includeLetAgreed=false&mustHave=&dontShow=&furnishTypes=furnished&keywords=';
const PAGE_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html?locationIdentifier=REGION%5E94019&minBedrooms=1&maxPrice=1000&radius=0.5&propertyTypes=&maxDaysSinceAdded=1&includeLetAgreed=false&mustHave=&dontShow=houseShare%2Cretirement%2Cstudent&furnishTypes=furnished&keywords=';
//const PAGE_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html?locationIdentifier=REGION%5E904&radius=40.0&propertyTypes=&maxDaysSinceAdded=1&mustHave=&dontShow=&furnishTypes=&keywords=';

// db stuff
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pqyfdwkcmphqkgluhvku.supabase.co', '');

const cachedProperties = [];

const startScraping = async () => {
  startBot(PAGE_URL);
  await sleep(2000);
  fetchTimer();
  setInterval(fetchTimer, (Math.random() * 15 + 30 ) * 1000); // 30 - 45 seconds
}

const fetchTimer = async () => {
  console.log('fetching...');
  const properties = await scrapeProperties();
  //console.log(properties);

  for (const property of properties)
  {
    if(!cachedProperties.includes(property.id))
    {
      const {id, price, address, fullLInk, description } = property;
      const { error } = await supabase
      .from('Property')
      .insert([
        { id, price, address, link: fullLInk, description },
      ]);
  
      if (!error) {
        // its a new property! use the dicord bot
        const message = buildDiscordMessage(property);
        sendMessage(message);
        console.log('New Property! ' + fullLInk);
        cachedProperties.push(property.id);
      } else if (error.code == 23505) {
        cachedProperties.push(property.id);
        // already exists don't do anything
        console.log('In database!');
      }
      else {
        // something else went wrong! use discord for errors
        console.log(error);
        sendMessage("ERROR!: " + error.message);
      }
  
      //break;
    }
  }

  removeCachedProperties(properties);
}

const removeCachedProperties = (properties) => {
  // Removes cached properties when they are hidden/removed/past 24 hours
  const returnedProps = [];
  for (const property of properties)
  {
    returnedProps.push(property.id);
  }

  for (let i = cachedProperties.length - 1; i > 0; i--)
  {
    if (!returnedProps.includes(cachedProperties[i])) {
      cachedProperties.splice(i, 1);
    }
  }
}

const scrapeProperties = async () => {
  try {
    const { data } = await axios.get(PAGE_URL);
    const $ = cheerio.load(data);
    const propertiesRaw = $('div.propertyCard-wrapper');
    const properties = [];
  
    for (const property of propertiesRaw)
    {
      //console.log($(property).html());
      const propLink = $(property).find('.propertyCard-link').attr('href'); 
      if (!propLink) continue; // Exit if the link cannot be found - Premium Property
      
      const fullLInk = 'https://www.rightmove.co.uk' + propLink;
      const id = propLink.split('/')[2].slice(0, 8);
      const priceRaw = $(property).find('.propertyCard-priceValue').text();
      const price = priceRaw.slice(1, priceRaw.length - 3).trim().replace(',','');
      const address = $(property).find('.propertyCard-address span').text();
      const description = $(property).find('.propertyCard-description span').text();
      
      const isFeatured = $(property).find('.propertyCard-moreInfoFeaturedTitle').text().toLowerCase().includes("featured");
      //console.log(isFeatured);
  
      if (!isFeatured) {
        properties.push({ fullLInk, id, price, address, description });
      }
    }
  
    return properties;
  } catch(error) {
    sendMessage("ERROR!: " + error.message);
    return [];
  }
}

const buildDiscordMessage = (property) => {
  var date = new Date();
  date.setHours(date.getHours() + 1);
  
  var time = date.toLocaleTimeString('en-GB');
  let message = `**£${property.price} PCM** ${property.address} - Added ${time} \n${property.fullLInk}\n\n`;
  return message;
}


const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { startScraping };