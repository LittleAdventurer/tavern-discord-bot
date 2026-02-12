// 대시보드 앱
class Dashboard {
  constructor() {
    this.user = null;
    this.currentSection = 'home';
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.setupNavigation();
    this.setupTabs();
    this.loadBotStatus();
    this.loadStats();
  }

  // 인증 상태 확인
  async checkAuth() {
    try {
      const res = await fetch('/auth/me');
      const data = await res.json();

      document.getElementById('auth-loading').style.display = 'none';

      if (data.authenticated) {
        this.user = data.user;
        document.getElementById('auth-logged-in').style.display = 'flex';
        document.getElementById('user-avatar').src = data.user.avatarURL;
        document.getElementById('user-name').textContent = data.user.username;
        document.body.classList.add('logged-in');
      } else {
        document.getElementById('auth-logged-out').style.display = 'block';
      }
    } catch (error) {
      console.error('인증 확인 오류:', error);
      document.getElementById('auth-loading').style.display = 'none';
      document.getElementById('auth-logged-out').style.display = 'block';
    }
  }

  // 네비게이션 설정
  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.showSection(section);
      });
    });
  }

  // 섹션 전환
  showSection(sectionName) {
    // 네비게이션 활성화 상태 업데이트
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionName);
    });

    // 섹션 표시/숨김
    document.querySelectorAll('.section').forEach(section => {
      section.style.display = 'none';
    });
    document.getElementById(`section-${sectionName}`).style.display = 'block';

    this.currentSection = sectionName;

    // 섹션별 데이터 로드
    if (sectionName === 'ranking') {
      this.loadRanking('chat');
    } else if (sectionName === 'mypage') {
      this.loadMyPage();
    }
  }

  // 탭 설정
  setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // 탭 버튼 활성화
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === tab);
        });

        // 랭킹 리스트 전환
        document.getElementById('ranking-chat').style.display = tab === 'chat' ? 'flex' : 'none';
        document.getElementById('ranking-voice').style.display = tab === 'voice' ? 'flex' : 'none';

        this.loadRanking(tab);
      });
    });
  }

  // 봇 상태 로드
  async loadBotStatus() {
    try {
      const res = await fetch('/api/bot/status');
      const data = await res.json();

      document.getElementById('bot-online').textContent = data.status === 'online' ? '온라인' : '오프라인';
      document.getElementById('bot-ping').textContent = `${data.ping}ms`;
      document.getElementById('bot-guilds').textContent = data.guilds;
      document.getElementById('bot-uptime').textContent = this.formatUptime(data.uptime);
    } catch (error) {
      console.error('봇 상태 로드 오류:', error);
      document.getElementById('bot-online').textContent = '오프라인';
      document.getElementById('bot-online').classList.remove('status-online');
      document.getElementById('bot-online').style.color = 'var(--error)';
    }
  }

  // 통계 로드
  async loadStats() {
    try {
      const res = await fetch('/api/stats/overview');
      const data = await res.json();

      document.getElementById('stat-users').textContent = this.formatNumber(data.totalUsers);
      document.getElementById('stat-balance').textContent = this.formatNumber(data.totalBalance);
      document.getElementById('stat-chat').textContent = this.formatNumber(data.totalChatCount);
      document.getElementById('stat-voice').textContent = this.formatDuration(data.totalVoiceTime);
    } catch (error) {
      console.error('통계 로드 오류:', error);
    }
  }

  // 랭킹 로드
  async loadRanking(type) {
    const container = document.getElementById(`ranking-${type}`);
    container.innerHTML = '<div class="loading">로딩 중...</div>';

    try {
      const res = await fetch(`/api/ranking/${type}?limit=10`);
      const data = await res.json();

      if (data.length === 0) {
        container.innerHTML = '<div class="loading">데이터가 없습니다.</div>';
        return;
      }

      container.innerHTML = data.map((entry, index) => `
        <div class="ranking-item ${index < 3 ? `top-${index + 1}` : ''}">
          <span class="rank-number">${entry.rank}</span>
          <img class="rank-avatar" src="${entry.discord?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="">
          <div class="rank-info">
            <div class="rank-name">${entry.discord?.displayName || entry.discord?.username || '알 수 없음'}</div>
            <div class="rank-value">${type === 'chat' ? `${this.formatNumber(entry.value)} 메시지` : this.formatDuration(entry.value)}</div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('랭킹 로드 오류:', error);
      container.innerHTML = '<div class="loading">로드 실패</div>';
    }
  }

  // 내 정보 로드
  async loadMyPage() {
    if (!this.user) {
      document.getElementById('mypage-content').style.display = 'none';
      document.getElementById('mypage-login-required').style.display = 'block';
      return;
    }

    document.getElementById('mypage-content').style.display = 'block';
    document.getElementById('mypage-login-required').style.display = 'none';

    try {
      const res = await fetch('/api/me/stats');
      const data = await res.json();

      document.getElementById('my-avatar').src = data.discord?.avatar || this.user.avatarURL;
      document.getElementById('my-name').textContent = data.discord?.displayName || data.discord?.username || this.user.username;
      document.getElementById('my-id').textContent = data.user_id;
      document.getElementById('my-balance').textContent = this.formatNumber(data.balance);
      document.getElementById('my-chat').textContent = this.formatNumber(data.chat_count);
      document.getElementById('my-voice').textContent = this.formatDuration(data.voice_time);
      document.getElementById('my-daily').textContent = data.daily_check || '출석 기록 없음';
    } catch (error) {
      console.error('내 정보 로드 오류:', error);
    }
  }

  // 유틸리티: 숫자 포맷
  formatNumber(num) {
    if (num === undefined || num === null) return '--';
    return num.toLocaleString('ko-KR');
  }

  // 유틸리티: 시간 포맷 (초 → 시:분:초)
  formatDuration(seconds) {
    if (seconds === undefined || seconds === null) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  }

  // 유틸리티: 가동시간 포맷
  formatUptime(ms) {
    if (!ms) return '--';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 ${hours % 24}시간`;
    if (hours > 0) return `${hours}시간 ${minutes % 60}분`;
    return `${minutes}분`;
  }
}

// 앱 시작
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});
