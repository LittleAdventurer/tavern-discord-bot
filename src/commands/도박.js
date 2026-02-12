import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUser, updateBalance, hasBuff, consumeBuff, BUFF_TYPES } from '../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('도박')
  .setDescription('주사위 도박! 51 이상이면 승리, 100이면 잭팟!')
  .addIntegerOption(option =>
    option.setName('금액')
      .setDescription('배팅할 금액 (0 입력시 올인)')
      .setRequired(true)
      .setMinValue(0));

export async function execute(interaction) {
  const userId = interaction.user.id;
  const user = getUser(userId);
  let betAmount = interaction.options.getInteger('금액');

  // 올인 처리
  if (betAmount === 0) {
    betAmount = user.balance;
  }

  // 잔액 확인
  if (user.balance <= 0) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 도박 실패')
        .setDescription('잔액이 없습니다. 출석체크로 돈을 벌어보세요!')],
      ephemeral: true
    });
  }

  if (user.balance < betAmount) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 도박 실패')
        .setDescription(`잔액이 부족합니다.\n현재 잔액: ${user.balance.toLocaleString()}원`)],
      ephemeral: true
    });
  }

  // 행운의 맥주 버프 확인
  const hasLuckyBuff = hasBuff(userId, BUFF_TYPES.LUCKY_BEER);
  let buffUsed = false;

  // 주사위 굴리기
  const roll = Math.floor(Math.random() * 100) + 1;
  let result, color, winAmount;

  // 승리 기준: 기본 51 이상, 버프 있으면 41 이상 (+10%)
  const winThreshold = hasLuckyBuff ? 41 : 51;

  if (roll === 100) {
    // 잭팟! 5배
    winAmount = betAmount * 5;
    updateBalance(userId, winAmount - betAmount);
    result = '🎰 JACKPOT!!!';
    color = 0xF1C40F;
  } else if (roll >= winThreshold) {
    // 승리 2배
    winAmount = betAmount * 2;
    updateBalance(userId, betAmount);
    result = hasLuckyBuff ? '🍀 행운의 승리!' : '🎉 승리!';
    color = 0x2ECC71;
  } else {
    // 패배
    winAmount = 0;
    updateBalance(userId, -betAmount);
    result = '💀 패배...';
    color = 0xE74C3C;
  }

  // 버프 소모 (사용했으면)
  if (hasLuckyBuff) {
    consumeBuff(userId, BUFF_TYPES.LUCKY_BEER);
    buffUsed = true;
  }

  const newBalance = getUser(userId).balance;
  const isWin = roll >= winThreshold || roll === 100;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎲 도박 결과: ${result}`)
    .setDescription(`주사위: **${roll}**${buffUsed ? '\n🍺 행운의 맥주 효과 적용! (승률 +10%)' : ''}`)
    .addFields(
      { name: '배팅 금액', value: `${betAmount.toLocaleString()}원`, inline: true },
      { name: isWin ? '획득 금액' : '잃은 금액', value: isWin ? `+${winAmount.toLocaleString()}원` : `-${betAmount.toLocaleString()}원`, inline: true },
      { name: '현재 잔액', value: `${newBalance.toLocaleString()}원`, inline: true }
    )
    .setFooter({ text: buffUsed ? '41 이상: 2배 | 100: 5배 잭팟 (버프 적용)' : '51 이상: 2배 | 100: 5배 잭팟' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
