import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { checkDaily, getBestStewFromInventory, useItem, getItemQuantity } from '../database/db.js';

const BASE_REWARD = 5000;

export const data = new SlashCommandBuilder()
  .setName('출석')
  .setDescription('하루 1회 출석체크로 5,000원을 받습니다.');

export async function execute(interaction) {
  const userId = interaction.user.id;

  // 인벤토리에서 가장 강한 스튜 찾기 (자동 사용)
  const stewInfo = getBestStewFromInventory(userId);
  const multiplier = stewInfo ? stewInfo.multiplier : 1.0;
  const rewardAmount = Math.floor(BASE_REWARD * multiplier);

  const result = checkDaily(userId, rewardAmount);

  if (!result.success) {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('❌ 출석 실패')
      .setDescription(result.message)
      .setTimestamp();

    return await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // 출석 성공 시 스튜 소모
  let stewUsedDescription = '';
  if (stewInfo) {
    useItem(userId, stewInfo.itemId);
    const remainingQuantity = getItemQuantity(userId, stewInfo.itemId);
    stewUsedDescription = `\n${stewInfo.item.emoji} **${stewInfo.item.name}** 사용! (${multiplier}배, 남은 수량: ${remainingQuantity}개)`;
  }

  const hasStew = multiplier > 1.0;

  const embed = new EmbedBuilder()
    .setColor(hasStew ? 0xF1C40F : 0x2ECC71)
    .setTitle(hasStew ? '✨ 특별 출석 완료!' : '✅ 출석 완료!')
    .setDescription(`**${interaction.user.displayName}**님, 출석체크 완료!${stewUsedDescription}`)
    .addFields(
      { name: '지급 포인트', value: `+${rewardAmount.toLocaleString()}원${hasStew ? ` (${multiplier}배!)` : ''}`, inline: true },
      { name: '현재 잔액', value: `${result.newBalance.toLocaleString()}원`, inline: true }
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
