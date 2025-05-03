const axios = require('axios');

// Convert miles to kilometers
const milesToKilometers = (miles) => (miles * 1.60934).toFixed(2);

// Fetch Pokémon TCG events from Eventbrite
const fetchPokemonEvents = async (city, radius = 50) => {
    const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;
    const url = 'https://www.eventbriteapi.com/v3/events/search/';

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
            },
            params: {
                q: 'pokemon trading cards',
                'location.address': city,
                'location.within': `${radius}km`,
                sort_by: 'distance',
            },
        });

        const events = response.data.events.slice(0, 5); // Get top 5 events
        return events.map((event) => ({
            name: event.name.text,
            date: new Date(event.start.local).toLocaleString(),
            address: event.venue ? `${event.venue.address.localized_address_display}` : 'Address not available',
            price: event.is_free ? 'Free' : event.ticket_availability.minimum_ticket_price
                ? `$${event.ticket_availability.minimum_ticket_price.major_value}`
                : 'Price not available',
            distance: milesToKilometers(event.distance || 0), // Convert distance to kilometers
        }));
    } catch (error) {
        console.error('Error fetching events from Eventbrite:', error.message);
        throw new Error('Failed to fetch events. Please try again later.');
    }
};

// Format events for Discord
const formatEventsForDiscord = (events, city) => {
    if (events.length === 0) {
        return `No Pokémon TCG events found near ${city}.`;
    }

    return `🎉 **Top Pokémon TCG Events Near ${city}:** 🎉\n\n` +
        events
            .map((event, index) =>
                `**${index + 1}. ${event.name}**\n` +
                `📅 **Date/Time:** ${event.date}\n` +
                `📍 **Address:** ${event.address}\n` +
                `💵 **Price:** ${event.price}\n` +
                `📏 **Distance:** ${event.distance} km\n`
            )
            .join('\n\n');
};

module.exports = { fetchPokemonEvents, formatEventsForDiscord };