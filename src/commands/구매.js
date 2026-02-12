import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { purchaseItem, getShopItemById, getUser, hasItem } from '../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('구매')
  .setDescription('상점에서 아이템을 구매합니다.')
  .addIntegerOption(option =>
    option.setName('아이템번호')
      .setDescription('구매할 아이템의 번호 (/상점에서 확인)')
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const itemId = interaction.options.getInteger('아이템번호');
  const userId = interaction.user.id;

  // 아이템 존재 여부 확인
  const item = getShopItemById(itemId);
  if (!item) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('❌ 구매 실패')
      .setDescription('존재하지 않는 아이템 번호입니다.\n`/상점` 명령어로 아이템 목록을 확인하세요.')
      .setTimestamp();

    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }

  // 이미 보유 중인지 확인 (칭호/수집품)
  if (!item.consumable && hasItem(userId, itemId)) {
    const alreadyOwnedEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('❌ 구매 실패')
      .setDescription(`**${item.emoji} ${item.name}**은(는) 이미 보유하고 있습니다.`)
      .setTimestamp();

    return await interaction.reply({ embeds: [alreadyOwnedEmbed], ephemeral: true });
  }

  // 잔액 확인
  const user = getUser(userId);
  if (user.balance < item.price) {
    const insufficientEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('❌ 잔액 부족')
      .setDescription(`**${item.emoji} ${item.name}**을(를) 구매하기에 잔액이 부족합니다.`)
      .addFields(
        { name: '필요 금액', value: `${item.price.toLocaleString()}원`, inline: true },
        { name: '보유 잔액', value: `${user.balance.toLocaleString()}원`, inline: true },
        { name: '부족 금액', value: `${(item.price - user.balance).toLocaleString()}원`, inline: true }
      )
      .setTimestamp();

    return await interaction.reply({ embeds: [insufficientEmbed], ephemeral: true });
  }

  // 구매 진행
  const result = purchaseItem(userId, itemId);

  if (!result.success) {
    const failEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('❌ 구매 실패')
      .setDescription(result.message)
      .setTimestamp();

    return await interaction.reply({ embeds: [failEmbed], ephemeral: true });
  }

  // 구매 성공
  const successEmbed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('🎉 구매 완료!')
    .setDescription(`**${item.emoji} ${item.name}**을(를) 구매했습니다!`)
    .addFields(
      { name: '구매 가격', value: `${item.price.toLocaleString()}원`, inline: true },
      { name: '남은 잔액', value: `${result.newBalance.toLocaleString()}원`, inline: true }
    )
    .setTimestamp();

  if (item.consumable) {
    successEmbed.addFields({ name: '보유 수량', value: `${result.quantity}개`, inline: true });
    successEmbed.setFooter({ text: '💡 소비 아이템은 /인벤토리에서 확인하세요' });
  } else {
    successEmbed.setFooter({ text: '💡 보유 아이템은 /인벤토리에서 확인하세요' });
  }

  await interaction.reply({ embeds: [successEmbed] });
}
