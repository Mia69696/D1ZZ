require('dotenv').config();
const logger = require('./src/utils/logger');

logger.info('🚀 Starting d1z...');

// Start dashboard + bot together
require('./dashboard/server');

setTimeout(() => {
  require('./src/index');
}, 2000);
