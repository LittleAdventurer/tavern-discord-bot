import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getShopItems, getUser } from '../database/db.js';

const categoryNames = {
  title: '🏷️ 칭호',
  consumable: '🍺 소비품',
  collectible: '🎁 수집품'
};

const categoryOrder = ['title', 'consumable', 'collectible'];

export const data = new SlashCommandBuilder()
  .setName('상점')
  .setDescription('여관 상점에서 아이템을 구경합니다.')
  .addStringOption(option =>
    option.setName('카테고리')
      .setDescription('보고 싶은 아이템 종류')
      .addChoices(
        { name: '🏷️ 칭호', value: 'title' },
        { name: '🍺 소비품', value: 'consumable' },
        { name: '🎁 수집품', value: 'collectible' }
      )
  );

export async function execute(interaction) {
  const category = interaction.options.getString('카테고리');
  const user = getUser(interaction.user.id);
  const items = getShopItems(category);

  if (items.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor(0x95A5A6)
      .setTitle('🏪 여관 상점')
      .setDescription('현재 판매 중인 아이템이 없습니다.')
      .setTimestamp();

    return await interaction.reply({ embeds: [emptyEmbed] });
  }

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('🏪 여관 상점')
    .setDescription(`**${interaction.user.displayName}**님의 잔액: **${user.balance.toLocaleString()}원**\n\n구매하려면 \`/구매 [아이템번호]\` 명령어를 사용하세요.`)
    .setTimestamp();

  if (category) {
    // 특정 카테고리만 표시
    let itemList = '';
    items.forEach(item => {
      const consumableTag = item.consumable ? ' (소비품)' : '';
      itemList += `**${item.id}.** ${item.emoji} ${item.name} - **${item.price.toLocaleString()}원**${consumableTag}\n`;
      itemList += `└ ${item.description}\n\n`;
    });

    embed.addFields({ name: categoryNames[category], value: itemList || '없음', inline: false });
  } else {
    // 모든 카테고리 표시
    for (const cat of categoryOrder) {
      const categoryItems = items.filter(item => item.category === cat);
      if (categoryItems.length > 0) {
        let itemList = '';
        categoryItems.forEach(item => {
          const consumableTag = item.consumable ? ' (소비품)' : '';
          itemList += `**${item.id}.** ${item.emoji} ${item.name} - **${item.price.toLocaleString()}원**${consumableTag}\n`;
        });

        embed.addFields({ name: categoryNames[cat], value: itemList, inline: false });
      }
    }
  }

  embed.setFooter({ text: '💡 아이템 상세 정보는 /구매 명령어에서 확인하세요' });

  await interaction.reply({ embeds: [embed] });
}
