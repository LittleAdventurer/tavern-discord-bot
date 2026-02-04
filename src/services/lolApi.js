/**
 * League of Legends API Service
 * Riot Games API integration for fetching summoner stats
 */

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Regional routing for different API endpoints
const REGIONS = {
  kr: {
    platform: 'kr.api.riotgames.com',
    regional: 'asia.api.riotgames.com'
  }
};

// Queue type mappings for Korean display
const QUEUE_NAMES = {
  RANKED_SOLO_5x5: '솔로랭크',
  RANKED_FLEX_SR: '자유랭크'
};

// Tier name mappings for Korean display
const TIER_NAMES = {
  IRON: '아이언',
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  EMERALD: '에메랄드',
  DIAMOND: '다이아몬드',
  MASTER: '마스터',
  GRANDMASTER: '그랜드마스터',
  CHALLENGER: '챌린저'
};

// Tier colors for embeds
const TIER_COLORS = {
  IRON: 0x6B6B6B,
  BRONZE: 0xCD7F32,
  SILVER: 0xC0C0C0,
  GOLD: 0xFFD700,
  PLATINUM: 0x00CED1,
  EMERALD: 0x50C878,
  DIAMOND: 0xB9F2FF,
  MASTER: 0x9932CC,
  GRANDMASTER: 0xDC143C,
  CHALLENGER: 0xF0E68C
};

/**
 * Make a request to the Riot API
 * @param {string} url - Full API URL
 * @returns {Promise<object|null>} - API response or null on error
 */
async function riotApiRequest(url) {
  if (!RIOT_API_KEY) {
    console.error('[LoL API] RIOT_API_KEY가 설정되지 않았습니다.');
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (response.status === 403) {
      console.error('[LoL API] API 키가 만료되었거나 유효하지 않습니다.');
      return null;
    }

    if (response.status === 429) {
      console.error('[LoL API] API 요청 한도 초과');
      return null;
    }

    if (!response.ok) {
      console.error(`[LoL API] API 오류: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[LoL API] 요청 실패:', error.message);
    return null;
  }
}

/**
 * Parse Riot ID from input (supports both "name#tag" and legacy "name" format)
 * @param {string} input - User input (e.g., "Hide on bush#KR1" or "Hide on bush")
 * @returns {{ gameName: string, tagLine: string }} - Parsed Riot ID components
 */
function parseRiotId(input) {
  if (input.includes('#')) {
    const [gameName, tagLine] = input.split('#');
    return { gameName: gameName.trim(), tagLine: tagLine.trim() };
  }
  // Default to KR1 tag for Korean server if no tag provided
  return { gameName: input.trim(), tagLine: 'KR1' };
}

/**
 * Get account info by Riot ID
 * @param {string} gameName - Game name
 * @param {string} tagLine - Tag line
 * @param {string} region - Region (default: kr)
 * @returns {Promise<object|null>} - Account data or null
 */
async function getAccountByRiotId(gameName, tagLine, region = 'kr') {
  const regionalUrl = REGIONS[region]?.regional || REGIONS.kr.regional;
  const url = `https://${regionalUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return await riotApiRequest(url);
}

/**
 * Get summoner info by PUUID
 * @param {string} puuid - Player Universal Unique ID
 * @param {string} region - Region (default: kr)
 * @returns {Promise<object|null>} - Summoner data or null
 */
async function getSummonerByPuuid(puuid, region = 'kr') {
  const platformUrl = REGIONS[region]?.platform || REGIONS.kr.platform;
  const url = `https://${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return await riotApiRequest(url);
}

/**
 * Get ranked stats by summoner ID
 * @param {string} summonerId - Encrypted summoner ID
 * @param {string} region - Region (default: kr)
 * @returns {Promise<Array|null>} - Array of ranked entries or null
 */
async function getRankedStats(summonerId, region = 'kr') {
  const platformUrl = REGIONS[region]?.platform || REGIONS.kr.platform;
  const url = `https://${platformUrl}/lol/league/v4/entries/by-summoner/${summonerId}`;
  return await riotApiRequest(url);
}

/**
 * Get complete player stats by Riot ID
 * @param {string} riotIdInput - Riot ID input (e.g., "Hide on bush#KR1")
 * @param {string} region - Region (default: kr)
 * @returns {Promise<object>} - Complete player stats or error object
 */
export async function getPlayerStats(riotIdInput, region = 'kr') {
  // Check if API key is configured
  if (!RIOT_API_KEY) {
    return {
      success: false,
      error: 'API_KEY_MISSING',
      message: 'Riot API 키가 설정되지 않았습니다.'
    };
  }

  // Parse Riot ID
  const { gameName, tagLine } = parseRiotId(riotIdInput);

  // Step 1: Get account info
  const account = await getAccountByRiotId(gameName, tagLine, region);
  if (!account) {
    return {
      success: false,
      error: 'ACCOUNT_NOT_FOUND',
      message: `소환사 "${gameName}#${tagLine}"을(를) 찾을 수 없습니다.`
    };
  }

  // Step 2: Get summoner info
  const summoner = await getSummonerByPuuid(account.puuid, region);
  if (!summoner) {
    return {
      success: false,
      error: 'SUMMONER_NOT_FOUND',
      message: '소환사 정보를 가져올 수 없습니다.'
    };
  }

  // Step 3: Get ranked stats
  const rankedData = await getRankedStats(summoner.id, region);

  // Process ranked data
  const rankedStats = {};
  if (rankedData && Array.isArray(rankedData)) {
    for (const entry of rankedData) {
      rankedStats[entry.queueType] = {
        tier: entry.tier,
        tierKr: TIER_NAMES[entry.tier] || entry.tier,
        rank: entry.rank,
        leaguePoints: entry.leaguePoints,
        wins: entry.wins,
        losses: entry.losses,
        winRate: Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
      };
    }
  }

  return {
    success: true,
    data: {
      riotId: `${account.gameName}#${account.tagLine}`,
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
      summonerLevel: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      profileIconUrl: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${summoner.profileIconId}.png`,
      rankedStats,
      soloRank: rankedStats.RANKED_SOLO_5x5 || null,
      flexRank: rankedStats.RANKED_FLEX_SR || null
    }
  };
}

/**
 * Format rank display string
 * @param {object} rankData - Rank data object
 * @returns {string} - Formatted rank string
 */
export function formatRankDisplay(rankData) {
  if (!rankData) return '언랭크';
  return `${rankData.tierKr} ${rankData.rank} (${rankData.leaguePoints} LP)`;
}

/**
 * Format win rate display
 * @param {object} rankData - Rank data object
 * @returns {string} - Formatted win rate string
 */
export function formatWinRate(rankData) {
  if (!rankData) return '-';
  return `${rankData.wins}승 ${rankData.losses}패 (${rankData.winRate}%)`;
}

/**
 * Get tier color for embed
 * @param {string} tier - Tier name (e.g., "GOLD")
 * @returns {number} - Hex color code
 */
export function getTierColor(tier) {
  return TIER_COLORS[tier] || 0x3498DB;
}

/**
 * Check if API is configured
 * @returns {boolean} - True if API key is set
 */
export function isApiConfigured() {
  return !!RIOT_API_KEY;
}

export { QUEUE_NAMES, TIER_NAMES };
