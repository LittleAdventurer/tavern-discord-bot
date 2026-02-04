import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { editMeme } from '../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('수정')
  .setDescription('저장된 내용을 수정합니다. (본인이 저장한 것만 수정 가능)')
  .addIntegerOption(option =>
    option.setName('id')
      .setDescription('수정할 내용의 ID (불러오기로 확인 가능)')
      .setRequired(true)
      .setMinValue(1))
  .addStringOption(option =>
    option.setName('내용')
      .setDescription('새로운 내용')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('키워드')
      .setDescription('새로운 키워드')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('이름')
      .setDescription('새로운 이름 (빈 문자열로 이름 제거 가능)')
      .setRequired(false));

export async function execute(interaction) {
  const id = interaction.options.getInteger('id');
  const newContent = interaction.options.getString('내용');
  const newKeyword = interaction.options.getString('키워드');
  const newName = interaction.options.getString('이름');

  // 아무것도 입력하지 않은 경우
  if (!newContent && !newKeyword && newName === null) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 수정 실패')
        .setDescription('수정할 내용, 키워드, 또는 이름 중 하나 이상을 입력해주세요.')],
      ephemeral: true
    });
  }

  // newName이 빈 문자열이면 null로 변환 (이름 제거)
  const processedName = newName === '' ? null : (newName === null ? undefined : newName);

  const result = editMeme(id, interaction.user.id, newContent, newKeyword, processedName);

  if (!result.success) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 수정 실패')
        .setDescription(result.message)],
      ephemeral: true
    });
  }

  const { oldMeme, newMeme } = result;
  const changes = [];

  if (oldMeme.content !== newMeme.content) {
    changes.push(`**내용**: ${oldMeme.content.length > 50 ? oldMeme.content.slice(0, 50) + '...' : oldMeme.content} → ${newMeme.content.length > 50 ? newMeme.content.slice(0, 50) + '...' : newMeme.content}`);
  }
  if (oldMeme.keyword !== newMeme.keyword) {
    changes.push(`**키워드**: ${oldMeme.keyword} → ${newMeme.keyword}`);
  }
  if (oldMeme.name !== newMeme.name) {
    const oldName = oldMeme.name || '(없음)';
    const updatedName = newMeme.name || '(없음)';
    changes.push(`**이름**: ${oldName} → ${updatedName}`);
  }

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('✏️ 수정 완료!')
    .addFields(
      { name: 'ID', value: String(id), inline: true },
      { name: '변경 사항', value: changes.join('\n') || '변경 없음', inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
