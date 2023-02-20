import discord
import requests

client = discord.Client()
API_KEY = 'your_google_api_key'

@client.event
async def on_ready():
    print('Logged in as {0.user}'.format(client))

@client.event
async def on_message(message):
    if message.author == client.user:
        return

    if message.content.startswith('!ask'):
        query = message.content[5:]
        response = get_answer(query)
        await message.channel.send(response)

def get_answer(query):
    url = 'https://kgsearch.googleapis.com/v1/entities:search'
    params = {
        'query': query,
        'key': API_KEY,
        'limit': 1,
        'indent': True,
    }
    response = requests.get(url, params=params)
    data = response.json()

    if 'itemListElement' in data:
        item = data['itemListElement'][0]['result']
        name = item.get('name', 'Unknown')
        description = item.get('description', 'No description available.')
        url = item.get('url', '')
        return f'{name}: {description}\n{url}'
    else:
        return 'Sorry, I could not find an answer to your question.'

client.run('your_discord_bot_token')