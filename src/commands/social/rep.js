const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { UserProfile } = require('../../models');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Give reputation to a user')
    .addUserOption(o => o.setName('user').setDescription('User to rep').setRequired(true)),
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ Cannot rep yourself.', ephemeral: true });
    if (target.bot) return interaction.reply({ content: '❌ Cannot rep bots.', ephemeral: true });
    await interaction.deferReply();

    let giver = UserProfile.findOne({ userId: interaction.user.id });
    if (!giver) giver = UserProfile.create({ userId: interaction.user.id });

    const now = Date.now();
    if (giver.lastRepGiven && now - new Date(giver.lastRepGiven).getTime() < 12 * 60 * 60 * 1000) {
      const next = new Date(new Date(giver.lastRepGiven).getTime() + 12 * 60 * 60 * 1000);
      return interaction.editReply({ content: `⏱️ You can give rep again <t:${Math.floor(next.getTime() / 1000)}:R>.` });
    }

    let receiver = UserProfile.findOne({ userId: target.id });
    if (!receiver) receiver = UserProfile.create({ userId: target.id });

    UserProfile.findOneAndUpdate({ userId: target.id }, { $set: { reputation: (receiver.reputation || 0) + 1 } }, { upsert: true });
    UserProfile.findOneAndUpdate({ userId: interaction.user.id }, { $set: { lastRepGiven: new Date().toISOString() } }, { upsert: true });

    const embed = new EmbedBuilder().setColor('#43b581').setTitle('⭐ Reputation Given!')
      .setDescription(`**${interaction.user.tag}** gave rep to **${target.tag}**!\nThey now have **${(receiver.reputation || 0) + 1}** rep.`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true })).setTimestamp();
    interaction.editReply({ embeds: [embed] });
  },
};
