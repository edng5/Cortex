/**
 * This module tracks mute events, calculates mute durations, and provides commands to check mute status.
 */

const { EmbedBuilder } = require('discord.js'); // For sending embedded logs

// Maps to track mute events and durations
const mutedUsers = new Map(); // Tracks when a user mutes themselves
const dailyMuteTime = new Map(); // Tracks total mute time for each user in a day

/**
 * Converts milliseconds to a formatted time string (HH:MM:SS).
 * 
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} - The formatted time string.
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
  name: 'muted', // Not a direct command but a module for mute-related functionality
  description: 'Tracks mute events and provides commands to check mute status.',

  /**
   * Handles voice state updates to track mute and unmute events.
   * 
   * @param {Object} oldState - The previous voice state of the user.
   * @param {Object} newState - The updated voice state of the user.
   * @param {Object} client - The Discord client instance.
   */
  async handleVoiceStateUpdate(oldState, newState, client) {
    const userId = newState.id;

    // Check if the user is muted
    if (!oldState.selfMute && newState.selfMute) {
      mutedUsers.set(userId, Date.now());
      console.log(`${newState.member.user.tag} is now muted.`);

      // Send mute log
      await this.sendMuteLog(newState.member, 'muted', client);
    }

    // Check if the user is unmuted
    if (oldState.selfMute && !newState.selfMute) {
      if (mutedUsers.has(userId)) {
        const mutedDuration = Date.now() - mutedUsers.get(userId);
        mutedUsers.delete(userId);

        // Update the user's total mute time for the day
        const currentMuteTime = dailyMuteTime.get(userId) || 0;
        const updatedMuteTime = currentMuteTime + mutedDuration;
        dailyMuteTime.set(userId, updatedMuteTime);

        console.log(`${newState.member.user.tag} was muted for ${Math.floor(mutedDuration / 1000)} seconds.`);
        console.log(`Cumulative mute time for ${newState.member.user.tag}: ${Math.floor(updatedMuteTime / 1000)} seconds.`);

        // Send unmute log
        await this.sendMuteLog(newState.member, 'unmuted', client, mutedDuration);
      }
    }
  },

  /**
   * Sends an embedded log message to the 'mute-logs' channel.
   * 
   * @param {Object} member - The Discord member object.
   * @param {string} action - The action performed ('muted' or 'unmuted').
   * @param {Object} client - The Discord client instance.
   * @param {number} [duration=null] - The duration of the mute in milliseconds (optional).
   */
  async sendMuteLog(member, action, client, duration = null) {
    const logChannel = member.guild.channels.cache.find(channel => channel.name === 'mute-logs');
    if (!logChannel) return; // Exit if the log channel doesn't exist

    // Calculate cumulative mute time for the day
    const totalMuteTime = dailyMuteTime.get(member.id) || 0;

    const embed = new EmbedBuilder()
      .setColor(action === 'muted' ? 0xff0000 : 0x00ff00) // Red for mute, green for unmute
      .setTitle(`User ${action}`)
      .setDescription(`${member.user.tag} (${member.id})`)
      .setTimestamp();

    if (action === 'muted') {
      embed.addFields(
        { name: 'Action', value: 'Muted', inline: true },
        { name: 'Cumulative Mute Time Today', value: formatTime(totalMuteTime), inline: true }
      );
    }

    if (action === 'unmuted' && duration !== null) {
      embed.addFields(
        { name: 'Action', value: 'Unmuted', inline: true },
        { name: 'Current Mute Duration', value: formatTime(duration), inline: true },
        { name: 'Cumulative Mute Time Today', value: formatTime(totalMuteTime), inline: true }
      );
    }

    await logChannel.send({ embeds: [embed] });
  },

  /**
   * Handles the !check_mute_time command to check total mute time for a user.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command.
   */
  async checkMuteTime(message, args) {
    const username = args[0];

    if (!username) {
      return message.channel.send('Please specify a username. Usage: `!check_mute_time <username>`');
    }

    const member = message.guild.members.cache.find(m => m.user.username === username);
    if (!member) {
      return message.channel.send(`User ${username} not found.`);
    }

    const totalMuteTime = dailyMuteTime.get(member.id) || 0;
    return message.channel.send(`${username} has been muted for a total of ${formatTime(totalMuteTime)} today.`);
  },

  /**
   * Handles the !check_muted command to check if a user is currently muted.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command.
   */
  async checkMuted(message, args) {
    const username = args[0];

    if (!username) {
      return message.channel.send('Please specify a username. Usage: `!check_muted <username>`');
    }

    const member = message.guild.members.cache.find(m => m.user.username === username);
    if (!member) {
      return message.channel.send(`User ${username} not found.`);
    }

    if (mutedUsers.has(member.id)) {
      const mutedDuration = Date.now() - mutedUsers.get(member.id);
      return message.channel.send(`${username} has been muted for ${formatTime(mutedDuration)}.`);
    } else {
      return message.channel.send(`${username} is not currently muted.`);
    }
  },
};