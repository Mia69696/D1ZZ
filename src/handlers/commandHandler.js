const { REST, Routes, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function loadCommands(client) {
  const slashCommands = [];
  const commandsPath = path.join(__dirname, '../commands');

  function loadDir(dirPath) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        loadDir(itemPath);
      } else if (item.endsWith('.js')) {
        try {
          const command = require(itemPath);
          if (!command.data || !command.execute) continue;
          client.slashCommands.set(command.data.name, command);
          slashCommands.push(command.data.toJSON());
          logger.info(`📦 Loaded command: /${command.data.name}`);
        } catch (err) {
          logger.error(`Failed to load command ${itemPath}:`, err.message);
        }
      }
    }
  }

  loadDir(commandsPath);

  // Register slash commands with Discord
  if (process.env.DISCORD_TOKEN && process.env.DISCORD_CLIENT_ID) {
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: slashCommands }
      );
      logger.info(`✅ Registered ${slashCommands.length} slash commands globally`);
    } catch (err) {
      logger.error('Failed to register slash commands:', err.message);
    }
  }
}

module.exports = { loadCommands };
