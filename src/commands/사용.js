import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useItem, activateBuff, hasBuff, BUFF_TYPES, STEW_ITEM_IDS, getShopItemById } from '../database/db.js';

// 일회성 버프 아이템
const ONE_TIME_BUFFS = {
  5: BUFF_TYPES.LUCKY_BEER    // 행운의 맥주
};

const BUFF_DESCRIPTIONS = {
  [BUFF_TYPES.LUCKY_BEER]: '다음 도박에서 승률 +10%'
};

export const data = new SlashCommandBuilder()
  .setName('사용')
  .setDescription('소비 아이템을 사용하여 효과를 활성화합니다.')
  .addIntegerOption(option =>
    option.setName('아이템번호')
      .setDescription('사용할 아이템 번호 (/인벤토리에서 확인)')
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const itemId = interaction.options.getInteger('아이템번호');

  // 아이템 정보 확인
  const item = getShopItemById(itemId);

  if (!item) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 사용 실패')
        .setDescription('존재하지 않는 아이템입니다.')],
      ephemeral: true
    });
  }

  // 소비 아이템인지 확인
  if (!item.consumable) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 사용 실패')
        .setDescription(`**${item.emoji} ${item.name}**은(는) 사용할 수 없는 아이템입니다.`)],
      ephemeral: true
    });
  }

  // 스튜 아이템은 출석 시 자동 사용됨
  if (STEW_ITEM_IDS.includes(itemId)) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('ℹ️ 안내')
        .setDescription(`**${item.emoji} ${item.name}**은(는) **/출석** 시 자동으로 사용됩니다.\n\n인벤토리에 스튜가 있으면 출석 시 가장 효과가 좋은 스튜가 자동으로 사용됩니다.`)],
      ephemeral: true
    });
  }

  // 일회성 버프 아이템 처리
  const buffType = ONE_TIME_BUFFS[itemId];
  if (!buffType) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 사용 실패')
        .setDescription('이 아이템은 아직 효과가 구현되지 않았습니다.')],
      ephemeral: true
    });
  }

  // 이미 같은 버프가 활성화되어 있는지 확인
  if (hasBuff(userId, buffType)) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 사용 실패')
        .setDescription(`이미 **${item.emoji} ${item.name}** 효과가 활성화되어 있습니다.\n기존 효과를 사용한 후 다시 시도하세요.`)],
      ephemeral: true
    });
  }

  // 아이템 사용 (인벤토리에서 차감)
  const useResult = useItem(userId, itemId);
  if (!useResult.success) {
    return await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ 사용 실패')
        .setDescription(useResult.message)],
      ephemeral: true
    });
  }

  // 일회성 버프 활성화
  activateBuff(userId, buffType, itemId);

  const embed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle(`${item.emoji} ${item.name} 사용!`)
    .setDescription(`**${interaction.user.displayName}**님이 **${item.name}**을(를) 사용했습니다!`)
    .addFields(
      { name: '효과', value: BUFF_DESCRIPTIONS[buffType], inline: true },
      { name: '남은 수량', value: `${useResult.remainingQuantity}개`, inline: true }
    )
    .setFooter({ text: '효과는 다음 사용 시 자동으로 적용됩니다.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
