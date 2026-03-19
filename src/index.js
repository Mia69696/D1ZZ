require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const logger = require('./utils/logger');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration, GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Collection();
client.musicQueues = new Map();
client.antiRaidData = new Map();
client.spamMap = new Map();

async function start() {
  await loadCommands(client);
  await loadEvents(client);
  await client.login(process.env.DISCORD_TOKEN);
  logger.info('🤖 d1z Bot starting...');
}

start().catch(err => { logger.error('Fatal error:', err); process.exit(1); });
module.exports = { client };
