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

// Queue ID to Korean name mapping (for match history)
const QUEUE_ID_NAMES = {
  420: '솔로랭크',
  440: '자유랭크',
  450: '칼바람 나락',
  400: '일반',
  430: '일반',
  490: '빠른대전',
  900: '우르프',
  1700: '아레나',
  1900: '우르프',
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
 * @returns {Promise<{success: boolean, data?: object, error?: string, status?: number}>} - API response with error info
 */
async function riotApiRequest(url) {
  if (!RIOT_API_KEY) {
    console.error('[LoL API] RIOT_API_KEY가 설정되지 않았습니다.');
    return { success: false, error: 'API_KEY_MISSING' };
  }

  try {
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY
      }
    });

    if (response.status === 404) {
      return { success: false, error: 'NOT_FOUND', status: 404 };
    }

    if (response.status === 403) {
      console.error('[LoL API] API 키가 만료되었거나 유효하지 않습니다.');
      return { success: false, error: 'API_KEY_INVALID', status: 403 };
    }

    if (response.status === 429) {
      console.error('[LoL API] API 요청 한도 초과');
      return { success: false, error: 'RATE_LIMIT', status: 429 };
    }

    if (!response.ok) {
      console.error(`[LoL API] API 오류: ${response.status}`);
      return { success: false, error: 'API_ERROR', status: response.status };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[LoL API] 요청 실패:', error.message);
    return { success: false, error: 'NETWORK_ERROR', message: error.message };
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
 * @returns {Promise<{success: boolean, data?: object, error?: string}>} - Account data or error
 */
async function getAccountByRiotId(gameName, tagLine, region = 'kr') {
  const regionalUrl = REGIONS[region]?.regional || REGIONS.kr.regional;
  const url = `https://${regionalUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  console.log(`[LoL API] 계정 조회: ${gameName}#${tagLine}`);
  return await riotApiRequest(url);
}

/**
 * Get summoner info by PUUID
 * @param {string} puuid - Player Universal Unique ID
 * @param {string} region - Region (default: kr)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>} - Summoner data or error
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
 * @returns {Promise<{success: boolean, data?: object, error?: string}>} - Array of ranked entries or error
 */
async function getRankedStats(summonerId, region = 'kr') {
  const platformUrl = REGIONS[region]?.platform || REGIONS.kr.platform;
  const url = `https://${platformUrl}/lol/league/v4/entries/by-summoner/${summonerId}`;
  return await riotApiRequest(url);
}

/**
 * Get recent match IDs by PUUID
 * @param {string} puuid - Player Universal Unique ID
 * @param {number} count - Number of matches to retrieve (default: 3)
 * @param {string} region - Region (default: kr)
 * @returns {Promise<{success: boolean, data?: string[], error?: string}>} - Array of match IDs or error
 */
async function getMatchIds(puuid, count = 3, region = 'kr') {
  const regionalUrl = REGIONS[region]?.regional || REGIONS.kr.regional;
  const url = `https://${regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
  return await riotApiRequest(url);
}

/**
 * Get match details by match ID
 * @param {string} matchId - Match ID
 * @param {string} region - Region (default: kr)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>} - Match data or error
 */
async function getMatchDetail(matchId, region = 'kr') {
  const regionalUrl = REGIONS[region]?.regional || REGIONS.kr.regional;
  const url = `https://${regionalUrl}/lol/match/v5/matches/${matchId}`;
  return await riotApiRequest(url);
}

/**
 * Get last N match results for a player
 * @param {string} puuid - Player Universal Unique ID
 * @param {number} count - Number of matches (default: 3)
 * @param {string} region - Region (default: kr)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>} - Processed match results
 */
export async function getRecentMatches(puuid, count = 3, region = 'kr') {
  const matchIdsResult = await getMatchIds(puuid, count, region);
  if (!matchIdsResult.success || !matchIdsResult.data?.length) {
    return { success: false, error: 'NO_MATCHES', message: '최근 게임 기록이 없습니다.' };
  }

  const matches = [];
  for (const matchId of matchIdsResult.data) {
    const matchResult = await getMatchDetail(matchId, region);
    if (!matchResult.success) continue;

    const match = matchResult.data;
    const participant = match.info.participants.find(p => p.puuid === puuid);
    if (!participant) continue;

    const kills = participant.kills;
    const deaths = participant.deaths;
    const assists = participant.assists;
    const kda = deaths === 0 ? 'Perfect' : ((kills + assists) / deaths).toFixed(1);

    matches.push({
      win: participant.win,
      championName: participant.championName,
      kills,
      deaths,
      assists,
      kda,
      cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
      gameDuration: match.info.gameDuration,
      queueId: match.info.queueId,
      queueName: QUEUE_ID_NAMES[match.info.queueId] || '기타',
    });
  }

  return { success: true, data: matches };
}

/**
 * Format a single match result for display
 * @param {object} match - Processed match data
 * @returns {string} - Formatted match string
 */
export function formatMatchResult(match) {
  const winIcon = match.win ? '🟦' : '🟥';
  const winText = match.win ? '승리' : '패배';
  const kdaStr = `${match.kills}/${match.deaths}/${match.assists} (${match.kda})`;
  const minutes = Math.floor(match.gameDuration / 60);
  const seconds = match.gameDuration % 60;
  return `${winIcon} **${winText}** | ${match.championName} | ${kdaStr} | CS ${match.cs} | ${minutes}:${String(seconds).padStart(2, '0')} | ${match.queueName}`;
}

/**
 * Get error message based on error type
 * @param {string} error - Error type
 * @param {string} gameName - Game name for context
 * @param {string} tagLine - Tag line for context
 * @returns {string} - Localized error message
 */
function getErrorMessage(error, gameName, tagLine) {
  const messages = {
    'API_KEY_MISSING': 'Riot API 키가 설정되지 않았습니다.',
    'API_KEY_INVALID': 'Riot API 키가 만료되었거나 유효하지 않습니다. 관리자에게 문의하세요.',
    'RATE_LIMIT': 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    'NETWORK_ERROR': '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    'NOT_FOUND': `소환사 "${gameName}#${tagLine}"을(를) 찾을 수 없습니다.\n태그가 정확한지 확인해주세요. (예: KR1, KR2 등)`,
    'API_ERROR': 'API 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  };
  return messages[error] || '알 수 없는 오류가 발생했습니다.';
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
  console.log(`[LoL API] 검색 요청: "${gameName}#${tagLine}"`);

  // Step 1: Get account info
  const accountResult = await getAccountByRiotId(gameName, tagLine, region);
  if (!accountResult.success) {
    console.log(`[LoL API] 계정 조회 실패: ${accountResult.error}`);
    return {
      success: false,
      error: accountResult.error,
      message: getErrorMessage(accountResult.error, gameName, tagLine)
    };
  }
  const account = accountResult.data;

  // Step 2: Get summoner info
  const summonerResult = await getSummonerByPuuid(account.puuid, region);
  if (!summonerResult.success) {
    console.log(`[LoL API] 소환사 조회 실패: ${summonerResult.error}`);
    return {
      success: false,
      error: summonerResult.error,
      message: summonerResult.error === 'NOT_FOUND'
        ? '이 계정은 롤을 플레이한 적이 없습니다.'
        : getErrorMessage(summonerResult.error, gameName, tagLine)
    };
  }
  const summoner = summonerResult.data;

  // Step 3: Get ranked stats
  const rankedResult = await getRankedStats(summoner.id, region);
  const rankedData = rankedResult.success ? rankedResult.data : [];

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

  // Step 4: Get recent match history
  const matchesResult = await getRecentMatches(account.puuid, 3, region);
  const recentMatches = matchesResult.success ? matchesResult.data : [];

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
      flexRank: rankedStats.RANKED_FLEX_SR || null,
      recentMatches
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
