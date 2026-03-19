const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ModAction } = require('../../models');
const { getNextCaseNumber } = require('../../modules/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason');
    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    await interaction.deferReply();
    const caseNum = getNextCaseNumber(interaction.guild.id);
    ModAction.create({ guildId: interaction.guild.id, caseNumber: caseNum, type: 'warn', targetId: target.id, targetTag: target.user.tag, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason });
    target.user.send(`⚠️ You were **warned** in **${interaction.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
    const warnCount = ModAction.countDocuments({ guildId: interaction.guild.id, targetId: target.id, type: 'warn' });
    const embed = new EmbedBuilder().setColor('#faa61a').setTitle(`⚠️ Warned — Case #${caseNum}`)
      .addFields({ name: 'User', value: target.user.tag, inline: true }, { name: 'Total Warnings', value: `${warnCount}`, inline: true }, { name: 'Reason', value: reason }).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  },
};
