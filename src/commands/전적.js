import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getPlayerStats, formatRankDisplay, formatWinRate, getTierColor, isApiConfigured, formatMatchResult } from '../services/lolApi.js';

const LOL_SITES = [
  { name: 'OP.GG', url: (nick) => `https://www.op.gg/summoners/kr/${encodeURIComponent(nick.replace('#', '-'))}` },
  { name: 'FOW.KR', url: (nick) => `https://fow.kr/find/${encodeURIComponent(nick.split('#')[0])}` }
];

export const data = new SlashCommandBuilder()
  .setName('전적')
  .setDescription('리그 오브 레전드 전적을 검색합니다.')
  .addStringOption(option =>
    option.setName('닉네임')
      .setDescription('닉네임#태그 (예: Hide on bush#KR1)')
      .setRequired(true));

export async function execute(interaction) {
  const nickname = interaction.options.getString('닉네임');

  // Build link buttons
  const buttons = LOL_SITES.map(site =>
    new ButtonBuilder()
      .setLabel(site.name)
      .setURL(site.url(nickname))
      .setStyle(ButtonStyle.Link)
  );
  const row = new ActionRowBuilder().addComponents(buttons);

  // If API is not configured, fallback to link-only response
  if (!isApiConfigured()) {
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('🎮 리그 오브 레전드 전적 검색')
      .setDescription(`**${nickname}**님의 전적을 확인하세요!`)
      .setFooter({ text: '아래 버튼을 클릭하면 해당 사이트로 이동합니다.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
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

    await interaction.editReply({ embeds: [errorEmbed], components: [row] });
    return;
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

  // Add recent match history
  if (data.recentMatches && data.recentMatches.length > 0) {
    const matchLines = data.recentMatches.map(m => formatMatchResult(m)).join('\n');
    embed.addFields({ name: '최근 게임', value: matchLines });
  }

  embed.setFooter({ text: '자세한 정보는 아래 버튼을 클릭하세요' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], components: [row] });
}
