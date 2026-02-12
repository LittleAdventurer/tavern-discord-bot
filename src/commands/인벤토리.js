import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserInventory, getUser, getUserBuffs } from '../database/db.js';

const categoryNames = {
  title: '🏷️ 칭호',
  consumable: '🍺 소비품',
  collectible: '🎁 수집품'
};

const categoryOrder = ['title', 'consumable', 'collectible'];

export const data = new SlashCommandBuilder()
  .setName('인벤토리')
  .setDescription('보유 중인 아이템을 확인합니다.')
  .addUserOption(option =>
    option.setName('유저')
      .setDescription('다른 유저의 인벤토리 확인 (선택)')
  );

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('유저') || interaction.user;
  const inventory = getUserInventory(targetUser.id);
  const user = getUser(targetUser.id);

  const isOwnInventory = targetUser.id === interaction.user.id;

  if (inventory.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor(0x95A5A6)
      .setTitle(`🎒 ${targetUser.displayName}님의 인벤토리`)
      .setDescription(isOwnInventory
        ? '보유 중인 아이템이 없습니다.\n`/상점`에서 아이템을 구매해보세요!'
        : '보유 중인 아이템이 없습니다.')
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    return await interaction.reply({ embeds: [emptyEmbed] });
  }

  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`🎒 ${targetUser.displayName}님의 인벤토리`)
    .setDescription(`총 **${inventory.length}**종류의 아이템 보유 중`)
    .setThumbnail(targetUser.displayAvatarURL())
    .setTimestamp();

  // 카테고리별로 아이템 그룹화
  for (const cat of categoryOrder) {
    const categoryItems = inventory.filter(item => item.category === cat);
    if (categoryItems.length > 0) {
      let itemList = '';
      categoryItems.forEach(item => {
        const quantityText = item.consumable ? ` x${item.quantity}` : '';
        itemList += `${item.emoji} **${item.name}**${quantityText}\n`;
      });

      embed.addFields({ name: categoryNames[cat], value: itemList, inline: true });
    }
  }

  // 활성화된 버프 표시
  const activeBuffs = getUserBuffs(targetUser.id);
  if (activeBuffs.length > 0) {
    const buffList = activeBuffs.map(b => {
      let buffText = `${b.emoji} **${b.name}**`;
      if (b.multiplier && b.multiplier > 1) {
        buffText += ` (${b.multiplier}배)`;
      }
      if (b.remainingDays) {
        buffText += ` - ${b.remainingDays}일 남음`;
      }
      return buffText;
    }).join('\n');
    embed.addFields({ name: '✨ 활성 효과', value: buffList, inline: false });
  }

  // 칭호 목록 표시 (보유한 칭호가 있으면)
  const titles = inventory.filter(item => item.category === 'title');
  if (titles.length > 0) {
    const titleList = titles.map(t => `${t.emoji} ${t.name}`).join(', ');
    embed.setFooter({ text: `보유 칭호: ${titleList}` });
  }

  await interaction.reply({ embeds: [embed] });
}
