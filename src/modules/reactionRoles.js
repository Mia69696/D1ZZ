const { Guild } = require('../models');
const logger = require('../utils/logger');

async function handleReactionRoleButton(interaction, client) {
  try {
    const roleId = interaction.customId.replace('rr_', '');
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: '❌ Role not found.', ephemeral: true });

    const member = interaction.member;
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(role);
      return interaction.reply({ content: `✅ Removed the **${role.name}** role.`, ephemeral: true });
    } else {
      await member.roles.add(role);
      return interaction.reply({ content: `✅ Added the **${role.name}** role.`, ephemeral: true });
    }
  } catch (err) {
    logger.error('Reaction role button error:', err.message);
    interaction.reply({ content: '❌ Failed to update role.', ephemeral: true }).catch(() => {});
  }
}

async function handleSelfRoleSelect(interaction, client) {
  try {
    const roleIds = interaction.values;
    const member = interaction.member;

    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildData?.selfRoles?.length) return;

    const allowedRoleIds = guildData.selfRoles.map(r => r.roleId);
    const toAdd = roleIds.filter(id => allowedRoleIds.includes(id));
    const toRemove = allowedRoleIds.filter(id => !roleIds.includes(id) && member.roles.cache.has(id));

    for (const id of toAdd) {
      const role = interaction.guild.roles.cache.get(id);
      if (role) await member.roles.add(role).catch(() => {});
    }
    for (const id of toRemove) {
      const role = interaction.guild.roles.cache.get(id);
      if (role) await member.roles.remove(role).catch(() => {});
    }

    interaction.reply({ content: '✅ Your roles have been updated!', ephemeral: true }).catch(() => {});
  } catch (err) {
    logger.error('Self role select error:', err.message);
  }
}

module.exports = { handleReactionRoleButton, handleSelfRoleSelect };
