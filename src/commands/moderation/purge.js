const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages at once')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });

    try {
      let messages = await interaction.channel.messages.fetch({ limit: 100 });
      if (filterUser) {
        messages = messages.filter(m => m.author.id === filterUser.id);
      }
      messages = [...messages.values()].slice(0, amount);

      // Filter out messages older than 14 days
      const now = Date.now();
      const valid = messages.filter(m => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

      if (!valid.length) return interaction.editReply({ content: '❌ No deletable messages found (messages must be under 14 days old).' });

      const deleted = await interaction.channel.bulkDelete(valid, true);
      interaction.editReply({ content: `✅ Deleted **${deleted.size}** message(s).` });
    } catch (err) {
      interaction.editReply({ content: `❌ Failed: ${err.message}` });
    }
  },
};
