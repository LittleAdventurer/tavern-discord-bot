import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getMeme } from '../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('불러오기')
  .setDescription('저장된 흑역사를 불러옵니다.')
  .addStringOption(option =>
    option.setName('키워드')
      .setDescription('저장할 때 사용한 키워드')
      .setRequired(true));

export async function execute(interaction) {
  const keyword = interaction.options.getString('키워드');
  const memes = getMeme(keyword);

  if (memes.length === 0) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 검색 실패')
        .setDescription(`"${keyword}" 키워드로 저장된 내용이 없습니다.`)],
      ephemeral: true
    });
  }

  // 여러 개가 있으면 모두 표시
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`📖 "${keyword}" 검색 결과`)
    .setDescription(`${memes.length}개의 결과를 찾았습니다.`)
    .setTimestamp();

  memes.slice(0, 5).forEach((meme) => {
    embed.addFields({
      name: `ID: ${meme.id}${meme.name ? ` (${meme.name})` : ''}`,
      value: meme.content.length > 200 ? meme.content.slice(0, 200) + '...' : meme.content,
      inline: false
    });
  });

  if (memes.length > 5) {
    embed.setFooter({ text: `외 ${memes.length - 5}개 더...` });
  }

  await interaction.reply({ embeds: [embed] });
}
