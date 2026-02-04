import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getRandomMemeByName } from '../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('나락')
  .setDescription('특정 인물의 흑역사를 랜덤으로 불러옵니다.')
  .addStringOption(option =>
    option.setName('이름')
      .setDescription('흑역사 주인공 이름')
      .setRequired(true));

export async function execute(interaction) {
  const name = interaction.options.getString('이름');
  const meme = getRandomMemeByName(name);

  if (!meme) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 검색 실패')
        .setDescription(`"${name}"님의 흑역사가 없습니다.\n\`/저장\` 명령어로 추가해보세요!`)],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xE91E63)
    .setTitle(`😈 ${name}의 흑역사`)
    .setDescription(meme.content)
    .addFields(
      { name: 'ID', value: String(meme.id), inline: true },
      { name: '키워드', value: meme.keyword, inline: true }
    )
    .setFooter({ text: `저장일: ${new Date(meme.created_at).toLocaleDateString('ko-KR')}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
