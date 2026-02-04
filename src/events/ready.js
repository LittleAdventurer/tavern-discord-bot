import { Events, ActivityType } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

// 여관 접수원 컨셉 상태 메시지
const statusMessages = [
  // 기본 업무 모드 (Playing)
  { type: ActivityType.Playing, message: '꼬마용사 여관 관리 중' },
  { type: ActivityType.Playing, message: '밀린 숙박비 계산 중' },
  { type: ActivityType.Playing, message: '객실 청소 중' },
  // 대기 모드 (Watching)
  { type: ActivityType.Watching, message: '빈 방이 있나 확인 중' },
  { type: ActivityType.Watching, message: '수상한 몬스터 감시 중' },
  // 서비스 모드 (Listening)
  { type: ActivityType.Listening, message: '용사님들의 주문 듣는 중' },
  { type: ActivityType.Listening, message: '모험 이야기 경청 중' },
];

// 상태 메시지 변경 간격 (30초)
const STATUS_INTERVAL = 30 * 1000;

let currentStatusIndex = 0;

function updateStatus(client) {
  const status = statusMessages[currentStatusIndex];
  client.user.setActivity(status.message, { type: status.type });
  currentStatusIndex = (currentStatusIndex + 1) % statusMessages.length;
}

export function execute(client) {
  console.log(`[Bot] ${client.user.tag}으로 로그인되었습니다!`);
  console.log(`[Bot] ${client.guilds.cache.size}개의 서버에서 활동 중`);

  // 초기 상태 설정
  updateStatus(client);
  console.log('[Bot] 상태 메시지 로테이션 시작');

  // 주기적으로 상태 메시지 변경
  setInterval(() => updateStatus(client), STATUS_INTERVAL);
}
