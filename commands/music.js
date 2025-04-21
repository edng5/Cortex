/**
 * This module allows the bot to join a voice channel and play music based on the provided title and artist.
 * It uses the play-dl library to fetch audio streams from YouTube.
 */

const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl'); // For fetching audio streams

module.exports = {
  name: '!play_music', // Command name to trigger this functionality
  description: 'Plays a song in the user\'s current voice channel.',

  /**
   * Executes the !play_music command.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command. 
   *                       args[0] is the song title, args[1] is the artist.
   */
  async execute(message, args) {
    const input = args.join(' '); // Combine arguments into a single string

    // Validate input
    if (!input) {
      return message.channel.send('Please specify the song title and artist. Usage: `!play_music <title> - <artist>`');
    }

    // Extract title and artist from the input
    const match = input.match(/^(.*?)(?:\s-\s)(.+)$/);
    if (!match) {
      return message.channel.send('Invalid format. Use: `!play_music <title> - <artist>`');
    }

    const title = match[1];
    const artist = match[2];
    const voiceChannel = message.member.voice.channel; // Get the user's current voice channel

    // Ensure the user is in a voice channel
    if (!voiceChannel) {
      return message.channel.send('You need to be in a voice channel to play music!');
    }

    try {
      // Search for the song on YouTube
      const searchQuery = `${title} ${artist}`;
      const searchResults = await play.search(searchQuery, { limit: 1 });
      if (searchResults.length === 0) {
        return message.channel.send('No results found for the specified song.');
      }

      const song = searchResults[0];
      const stream = await play.stream(song.url); // Fetch the audio stream

      // Join the voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      // Create an audio player and play the song
      const player = createAudioPlayer();
      const resource = createAudioResource(stream.stream, { inputType: stream.type });

      player.play(resource);
      connection.subscribe(player);

      // Notify the user that the song is playing
      message.channel.send(`🎵 Now playing: **${song.title}** by **${artist}**`);

      // Handle player events
      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy(); // Leave the voice channel when the song ends
      });

      player.on('error', (error) => {
        console.error('Error playing audio:', error);
        message.channel.send('An error occurred while playing the song.');
        connection.destroy();
      });
    } catch (error) {
      // Log the error and notify the user
      console.error('Error fetching or playing music:', error);
      message.channel.send('An error occurred while trying to play the song.');
    }
  },
};