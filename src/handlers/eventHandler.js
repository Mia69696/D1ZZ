const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      logger.info(`📡 Loaded event: ${event.name}`);
    } catch (err) {
      logger.error(`Failed to load event ${file}:`, err.message);
    }
  }
}

module.exports = { loadEvents };
