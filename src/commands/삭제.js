import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { deleteMeme } from '../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('삭제')
  .setDescription('저장된 내용을 삭제합니다. (본인이 저장한 것만 삭제 가능)')
  .addIntegerOption(option =>
    option.setName('id')
      .setDescription('삭제할 내용의 ID (불러오기로 확인 가능)')
      .setRequired(true)
      .setMinValue(1));

export async function execute(interaction) {
  const id = interaction.options.getInteger('id');
  const result = deleteMeme(id, interaction.user.id);

  if (!result.success) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 삭제 실패')
        .setDescription(result.message)],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('🗑️ 삭제 완료!')
    .addFields(
      { name: 'ID', value: String(id), inline: true },
      { name: '키워드', value: result.meme.keyword, inline: true },
      { name: '삭제된 내용', value: result.meme.content.length > 100 ? result.meme.content.slice(0, 100) + '...' : result.meme.content, inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
