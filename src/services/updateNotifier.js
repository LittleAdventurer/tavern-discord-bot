import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LAST_COMMIT_FILE = join(__dirname, '../../data/last-commit.txt');

function getCurrentCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function getStoredCommit() {
  try {
    return readFileSync(LAST_COMMIT_FILE, 'utf-8').trim();
  } catch {
    return null;
  }
}

function saveCommit(hash) {
  try {
    mkdirSync(dirname(LAST_COMMIT_FILE), { recursive: true });
    writeFileSync(LAST_COMMIT_FILE, hash, 'utf-8');
  } catch (err) {
    console.error('[Update] 커밋 해시 저장 실패:', err.message);
  }
}

function getCommitLog(fromHash, toHash) {
  try {
    const format = '%h|%s|%an|%cr';
    const log = execSync(
      `git log --pretty=format:"${format}" ${fromHash}..${toHash}`,
      { encoding: 'utf-8' }
    ).trim();

    if (!log) return [];

    return log.split('\n').map(line => {
      const [hash, subject, author, date] = line.split('|');
      return { hash, subject, author, date };
    });
  } catch {
    return [];
  }
}

function getCommitLogRecent(count = 5) {
  try {
    const format = '%h|%s|%an|%cr';
    const log = execSync(
      `git log --pretty=format:"${format}" -${count}`,
      { encoding: 'utf-8' }
    ).trim();

    if (!log) return [];

    return log.split('\n').map(line => {
      const [hash, subject, author, date] = line.split('|');
      return { hash, subject, author, date };
    });
  } catch {
    return [];
  }
}

function buildUpdateEmbed(commits, currentHash) {
  const description = commits
    .slice(0, 15)
    .map(c => `\`${c.hash}\` ${c.subject}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('📦 봇 업데이트 알림')
    .setDescription(description || '변경 사항을 불러올 수 없습니다.')
    .setFooter({ text: `최신 커밋: ${currentHash.substring(0, 7)}` })
    .setTimestamp();

  if (commits.length > 15) {
    embed.addFields({
      name: '📋 추가 변경사항',
      value: `외 ${commits.length - 15}개의 커밋이 더 있습니다.`,
    });
  }

  return embed;
}

export async function checkAndNotifyUpdate(client) {
  const channelId = process.env.UPDATE_CHANNEL_ID;
  if (!channelId) {
    console.log('[Update] UPDATE_CHANNEL_ID가 설정되지 않아 업데이트 알림을 건너뜁니다.');
    return;
  }

  const currentHash = getCurrentCommit();
  if (!currentHash) {
    console.log('[Update] Git 커밋 해시를 가져올 수 없습니다.');
    return;
  }

  const storedHash = getStoredCommit();

  // 최초 실행 시 현재 커밋만 저장하고 종료
  if (!storedHash) {
    console.log('[Update] 최초 실행 - 현재 커밋 해시를 저장합니다.');
    saveCommit(currentHash);
    return;
  }

  // 변경 없음
  if (storedHash === currentHash) {
    console.log('[Update] 업데이트 없음 - 이전과 동일한 커밋입니다.');
    return;
  }

  // 업데이트 감지
  console.log(`[Update] 업데이트 감지! ${storedHash.substring(0, 7)} → ${currentHash.substring(0, 7)}`);

  let commits = getCommitLog(storedHash, currentHash);

  // stored commit이 유효하지 않은 경우 (예: force push) 최근 커밋 표시
  if (commits.length === 0) {
    commits = getCommitLogRecent(5);
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error('[Update] 알림 채널을 찾을 수 없습니다:', channelId);
      saveCommit(currentHash);
      return;
    }

    const embed = buildUpdateEmbed(commits, currentHash);
    await channel.send({ embeds: [embed] });
    console.log('[Update] 업데이트 알림을 전송했습니다.');
  } catch (err) {
    console.error('[Update] 알림 전송 실패:', err.message);
  }

  saveCommit(currentHash);
}
