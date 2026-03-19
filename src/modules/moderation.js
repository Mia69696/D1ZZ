const { ModAction } = require('../models');
const logger = require('../utils/logger');

async function startPunishmentChecker(client) {
  setInterval(() => {
    try {
      const now = new Date();
      const actions = ModAction.find({ active: true });
      const expired = actions.filter(a => a.expiresAt && new Date(a.expiresAt) <= now && ['tempmute','tempban'].includes(a.type));
      for (const action of expired) {
        try {
          const guild = client.guilds.cache.get(action.guildId);
          if (!guild) continue;
          if (action.type === 'tempban') guild.members.unban(action.targetId, 'Temp-ban expired').catch(() => {});
          ModAction.updateOne({ _id: action._id }, { $set: { active: false } });
          logger.info(`Expired punishment removed: ${action.type} for ${action.targetId}`);
        } catch (err) {
          logger.error('Error removing expired punishment:', err.message);
        }
      }
    } catch (err) {
      logger.error('Punishment checker error:', err.message);
    }
  }, 30000);
}

function getNextCaseNumber(guildId) {
  const cases = ModAction.find({ guildId }, { sort: { caseNumber: -1 }, limit: 1 });
  return ((cases[0]?.caseNumber) || 0) + 1;
}

module.exports = { startPunishmentChecker, getNextCaseNumber };
