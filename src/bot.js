const { Client, Intents } = require('discord.js');
const TOKEN = '';
const USER_ID = '';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const startBot = (msg) => {
  client.on("ready", () => {
    client.users.fetch(USER_ID, false).then((user) => {
      user.send(`Bot starting... ${msg}`);
    });
  });
  
  client.login(TOKEN);
}

const sendMessage = (message) => {
  client.users.fetch(USER_ID, false).then((user) => {
    user.send(message);
  });
}

module.exports = { startBot, sendMessage };
