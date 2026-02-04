import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getPlayerStats, formatRankDisplay, formatWinRate, getTierColor, isApiConfigured } from '../services/lolApi.js';

export const data = new SlashCommandBuilder()
  .setName('전적')
  .setDescription('게임 전적 검색 링크를 제공합니다.')
  .addStringOption(option =>
    option.setName('게임')
      .setDescription('게임 선택')
      .setRequired(true)
      .addChoices(
        { name: '리그 오브 레전드', value: 'lol' },
        { name: '발로란트', value: 'valorant' },
        { name: '오버워치', value: 'overwatch' },
        { name: '배틀그라운드', value: 'pubg' },
        { name: '메이플스토리', value: 'maple' }
      ))
  .addStringOption(option =>
    option.setName('닉네임')
      .setDescription('검색할 닉네임 (LoL: 닉네임#태그)')
      .setRequired(true));

const gameInfo = {
  lol: {
    name: '리그 오브 레전드',
    emoji: '🎮',
    sites: [
      { name: 'OP.GG', url: (nick) => `https://www.op.gg/summoners/kr/${encodeURIComponent(nick.replace('#', '-'))}` },
      { name: 'FOW.KR', url: (nick) => `https://fow.kr/find/${encodeURIComponent(nick.split('#')[0])}` }
    ]
  },
  valorant: {
    name: '발로란트',
    emoji: '🔫',
    sites: [
      { name: 'Dak.gg', url: (nick) => `https://dak.gg/valorant/profile/${encodeURIComponent(nick)}` },
      { name: 'Tracker.gg', url: (nick) => `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(nick)}` }
    ]
  },
  overwatch: {
    name: '오버워치',
    emoji: '🦸',
    sites: [
      { name: 'Overbuff', url: (nick) => `https://www.overbuff.com/players/${encodeURIComponent(nick)}` }
    ]
  },
  pubg: {
    name: '배틀그라운드',
    emoji: '🍳',
    sites: [
      { name: 'Dak.gg', url: (nick) => `https://dak.gg/pubg/profile/${encodeURIComponent(nick)}` },
      { name: 'PUBG.OP.GG', url: (nick) => `https://pubg.op.gg/user/${encodeURIComponent(nick)}` }
    ]
  },
  maple: {
    name: '메이플스토리',
    emoji: '🍁',
    sites: [
      { name: 'Maple.gg', url: (nick) => `https://maple.gg/u/${encodeURIComponent(nick)}` }
    ]
  }
};

/**
 * Handle LoL stats with Riot API
 */
async function handleLoLStats(interaction, nickname) {
  // Check if API is configured
  if (!isApiConfigured()) {
    // Fallback to link-based response
    return null;
  }

  await interaction.deferReply();

  const result = await getPlayerStats(nickname);

  if (!result.success) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🎮 소환사 검색 실패')
      .setDescription(result.message)
      .setFooter({ text: '닉네임#태그 형식으로 입력해주세요. (예: Hide on bush#KR1)' })
      .setTimestamp();

    // Add fallback buttons
    const info = gameInfo.lol;
    const buttons = info.sites.map(site =>
      new ButtonBuilder()
        .setLabel(site.name)
        .setURL(site.url(nickname))
        .setStyle(ButtonStyle.Link)
    );
    const row = new ActionRowBuilder().addComponents(buttons);

    await interaction.editReply({ embeds: [errorEmbed], components: [row] });
    return true;
  }

  const { data } = result;

  // Determine embed color based on highest rank
  const highestRank = data.soloRank || data.flexRank;
  const embedColor = highestRank ? getTierColor(highestRank.tier) : 0x3498DB;

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🎮 ${data.riotId}`)
    .setThumbnail(data.profileIconUrl)
    .addFields(
      { name: '레벨', value: `${data.summonerLevel}`, inline: true }
    );

  // Add solo rank info
  if (data.soloRank) {
    embed.addFields(
      { name: '솔로랭크', value: formatRankDisplay(data.soloRank), inline: true },
      { name: '솔로랭크 전적', value: formatWinRate(data.soloRank), inline: true }
    );
  } else {
    embed.addFields(
      { name: '솔로랭크', value: '언랭크', inline: true },
      { name: '\u200B', value: '\u200B', inline: true }
    );
  }

  // Add flex rank info
  if (data.flexRank) {
    embed.addFields(
      { name: '자유랭크', value: formatRankDisplay(data.flexRank), inline: true },
      { name: '자유랭크 전적', value: formatWinRate(data.flexRank), inline: true }
    );
  } else {
    embed.addFields(
      { name: '자유랭크', value: '언랭크', inline: true },
      { name: '\u200B', value: '\u200B', inline: true }
    );
  }

  embed.setFooter({ text: '자세한 정보는 아래 버튼을 클릭하세요' })
    .setTimestamp();

  // Add site buttons
  const info = gameInfo.lol;
  const buttons = info.sites.map(site =>
    new ButtonBuilder()
      .setLabel(site.name)
      .setURL(site.url(nickname))
      .setStyle(ButtonStyle.Link)
  );
  const row = new ActionRowBuilder().addComponents(buttons);

  await interaction.editReply({ embeds: [embed], components: [row] });
  return true;
}

export async function execute(interaction) {
  const game = interaction.options.getString('게임');
  const nickname = interaction.options.getString('닉네임');
  const info = gameInfo[game];

  // Handle LoL with API
  if (game === 'lol') {
    const handled = await handleLoLStats(interaction, nickname);
    if (handled) return;
  }

  // Default link-based response for other games or API fallback
  const buttons = info.sites.map(site =>
    new ButtonBuilder()
      .setLabel(site.name)
      .setURL(site.url(nickname))
      .setStyle(ButtonStyle.Link)
  );

  const row = new ActionRowBuilder().addComponents(buttons);

  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`${info.emoji} ${info.name} 전적 검색`)
    .setDescription(`**${nickname}**님의 전적을 확인하세요!`)
    .setFooter({ text: '아래 버튼을 클릭하면 해당 사이트로 이동합니다.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], components: [row] });
}
