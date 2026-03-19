const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ModAction } = require('../../models');
const { getNextCaseNumber } = require('../../modules/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.reply({ content: '❌ User not in server.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ Cannot kick yourself.', ephemeral: true });
    await interaction.deferReply();
    try {
      await target.user.send(`👢 You were **kicked** from **${interaction.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
      await target.kick(reason);
      const caseNum = getNextCaseNumber(interaction.guild.id);
      ModAction.create({ guildId: interaction.guild.id, caseNumber: caseNum, type: 'kick', targetId: target.id, targetTag: target.user.tag, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason });
      const embed = new EmbedBuilder().setColor('#faa61a').setTitle(`👢 Kicked — Case #${caseNum}`)
        .addFields({ name: 'User', value: target.user.tag, inline: true }, { name: 'Moderator', value: interaction.user.tag, inline: true }, { name: 'Reason', value: reason }).setTimestamp();
      interaction.editReply({ embeds: [embed] });
    } catch (err) { interaction.editReply({ content: `❌ Failed: ${err.message}` }); }
  },
};
