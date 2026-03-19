const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Giveaway } = require('../models');
const logger = require('../utils/logger');

async function handleGiveawayButton(interaction, client) {
  try {
    if (interaction.customId !== 'giveaway_enter') return;

    const giveaway = await Giveaway.findOne({
      messageId: interaction.message.id,
      guildId: interaction.guild.id,
      ended: false,
    });

    if (!giveaway) return interaction.reply({ content: '❌ This giveaway has ended.', ephemeral: true });

    const userId = interaction.user.id;
    if (giveaway.entries.includes(userId)) {
      giveaway.entries = giveaway.entries.filter(e => e !== userId);
      await giveaway.save();
      return interaction.reply({ content: '✅ You have left the giveaway.', ephemeral: true });
    }

    giveaway.entries.push(userId);
    await giveaway.save();
    return interaction.reply({ content: `🎉 You entered the giveaway! (${giveaway.entries.length} entries)`, ephemeral: true });
  } catch (err) {
    logger.error('Giveaway button error:', err.message);
    interaction.reply({ content: '❌ Error entering giveaway.', ephemeral: true }).catch(() => {});
  }
}

async function endGiveaway(giveaway, client) {
  try {
    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    const entries = giveaway.entries;
    const winners = [];

    for (let i = 0; i < Math.min(giveaway.winnerCount, entries.length); i++) {
      const idx = Math.floor(Math.random() * entries.length);
      winners.push(entries.splice(idx, 1)[0]);
    }

    giveaway.winners = winners;
    giveaway.ended = true;
    await giveaway.save();

    const winnerMentions = winners.map(w => `<@${w}>`).join(', ') || 'No valid entries';

    const embed = new EmbedBuilder()
      .setColor('#ffd700')
      .setTitle(`🎉 Giveaway Ended — ${giveaway.prize}`)
      .setDescription(`**Winners:** ${winnerMentions}`)
      .addFields(
        { name: 'Total Entries', value: `${giveaway.entries.length + winners.length}`, inline: true },
        { name: 'Hosted by', value: `<@${giveaway.hostId}>`, inline: true }
      )
      .setTimestamp();

    channel.send({ content: `🎉 Congratulations ${winnerMentions}!`, embeds: [embed] }).catch(() => {});
  } catch (err) {
    logger.error('endGiveaway error:', err.message);
  }
}

module.exports = { handleGiveawayButton, endGiveaway };
