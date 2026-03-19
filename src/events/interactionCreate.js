const { InteractionType } = require('discord.js');
const logger = require('../utils/logger');
const { handleReactionRoleButton } = require('../modules/reactionRoles');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ─── Slash Commands ───────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;

      // Cooldown check
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Map());
      }
      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime) {
          const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
          return interaction.reply({
            content: `⏱️ Please wait **${timeLeft}s** before using \`/${command.data.name}\` again.`,
            ephemeral: true,
          });
        }
      }
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction, client);
      } catch (err) {
        logger.error(`Error executing /${interaction.commandName}:`, err);
        const errMsg = { content: '❌ An error occurred while executing this command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errMsg).catch(() => {});
        } else {
          await interaction.reply(errMsg).catch(() => {});
        }
      }
    }

    // ─── Button Interactions ─────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('rr_')) {
        await handleReactionRoleButton(interaction, client);
      }
      if (interaction.customId.startsWith('ticket_')) {
        const { handleTicketButton } = require('../modules/tickets');
        await handleTicketButton(interaction, client);
      }
      if (interaction.customId.startsWith('giveaway_')) {
        const { handleGiveawayButton } = require('../modules/giveaways');
        await handleGiveawayButton(interaction, client);
      }
    }

    // ─── Select Menu Interactions ────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('selfrole_')) {
        const { handleSelfRoleSelect } = require('../modules/reactionRoles');
        await handleSelfRoleSelect(interaction, client);
      }
    }

    // ─── Autocomplete ────────────────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (command?.autocomplete) {
        try {
          await command.autocomplete(interaction, client);
        } catch (err) {
          logger.error('Autocomplete error:', err);
        }
      }
    }
  },
};
