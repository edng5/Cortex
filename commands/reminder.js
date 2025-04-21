/**
 * This module allows users to set reminders for specific dates and times.
 * It uses the node-schedule library to schedule reminders.
 */

const schedule = require('node-schedule'); // For scheduling tasks

module.exports = {
  name: '!set_reminder', // Command name to trigger this functionality
  description: 'Sets a reminder for a specific date and time.',

  /**
   * Executes the !set_reminder command.
   * 
   * @param {Object} message - The Discord message object.
   * @param {Array} args - The arguments passed with the command. 
   *                       args[0] is the date/time, args[1] is the reminder message.
   */
  async execute(message, args) {
    const input = args.join(' '); // Combine arguments into a single string

    // Validate input
    if (!input) {
      return message.channel.send('Please specify the date, time, and reminder message. Usage: `!set_reminder <date/time> - <message> [-e]`');
    }

    // Extract date/time and reminder message
    const match = input.match(/^(.*?)(?:\s-\s)(.+?)(?:\s-\s-e)?$/);
    if (!match) {
      return message.channel.send('Invalid format. Use: `!set_reminder <date/time> - <message> [-e]`');
    }

    const dateTimeInput = match[1];
    let reminderMessage = match[2];
    const mentionEveryone = input.endsWith('-e'); // Check if the reminder should mention @everyone

    // Remove the `-e` flag from the message if present
    if (mentionEveryone) {
      reminderMessage = reminderMessage.replace(/\s-\s-e$/, '');
    }

    // Parse the date and time
    const reminderDate = new Date(dateTimeInput);
    if (isNaN(reminderDate)) {
      return message.channel.send('Invalid date/time format. Please try again.');
    }

    // Schedule the reminder
    schedule.scheduleJob(reminderDate, () => {
      const reminderText = mentionEveryone
        ? `@everyone ⏰ Reminder: ${reminderMessage}`
        : `⏰ Reminder: ${reminderMessage}`;
      message.channel.send(reminderText);
    });

    // Notify the user that the reminder has been set
    message.channel.send(`Reminder set for ${reminderDate.toLocaleString()}: "${reminderMessage}"${mentionEveryone ? ' (🚨)' : ''}`);
  },
};