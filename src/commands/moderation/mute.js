const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ModAction } = require('../../models');
const { getNextCaseNumber } = require('../../modules/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member')
    .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
    .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    await interaction.deferReply();
    try {
      await target.timeout(duration * 60 * 1000, reason);
      const caseNum = getNextCaseNumber(interaction.guild.id);
      ModAction.create({ guildId: interaction.guild.id, caseNumber: caseNum, type: 'mute', targetId: target.id, targetTag: target.user.tag, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason, duration, expiresAt: new Date(Date.now() + duration * 60 * 1000).toISOString() });
      const embed = new EmbedBuilder().setColor('#faa61a').setTitle(`🔇 Muted — Case #${caseNum}`)
        .addFields({ name: 'User', value: target.user.tag, inline: true }, { name: 'Duration', value: `${duration} min`, inline: true }, { name: 'Reason', value: reason }).setTimestamp();
      interaction.editReply({ embeds: [embed] });
    } catch (err) { interaction.editReply({ content: `❌ Failed: ${err.message}` }); }
  },
};
