// ============ STATE ============
const pages = ['home', 'news', 'tv', 'games', 'weather'];
let fs = parseFloat(localStorage.getItem('fs') || '1');
let newsLoaded = false;
let tvLoaded = false;
let gamesLoaded = false;
let currentNewsCat = 'sg';
let currentPoem = null;
let currentSpeakingBtn = null;

// ============ UTILS ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const byId = (id) => document.getElementById(id);
function stripHtml(s) { return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escAttr(s) { return escapeHtml(s); }

// ============ FONT SIZE ============
function applyFs() {
  fs = Math.max(0.85, Math.min(1.4, fs));
  document.documentElement.style.setProperty('--fs', fs);
  localStorage.setItem('fs', fs);
}
function changeFont(delta) { fs += delta; applyFs(); }
applyFs();

// ============ ROUTING ============
function show(id) {
  const wasOnTv = byId('page-tv').classList.contains('active');
  closeModal();
  pages.forEach(p => byId('page-' + p).classList.remove('active'));
  byId('page-' + id).classList.add('active');
  window.scrollTo(0, 0);
  location.hash = id === 'home' ? '' : id;
  // Pause the TV when leaving it; resume on return
  if (wasOnTv && id !== 'tv' && ytReady && ytPlayer && ytPlayer.pauseVideo) {
    try { ytPlayer.pauseVideo(); } catch (e) {}
  }
  if (id === 'tv' && !wasOnTv && ytReady && ytPlayer && ytPlayer.playVideo && currentChannel !== null) {
    try { ytPlayer.playVideo(); } catch (e) {}
  }
  if (id === 'news' && !newsLoaded) loadNewsTabs();
  if (id === 'tv') {
    if (!tvLoaded) loadTvGrid();
    onShowTv();
  }
  if (id === 'games' && !gamesLoaded) loadGamesGrid();
  if (id === 'weather') loadWeatherPage();
}

// ============ CLOCK + GREETING ============
const zhDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
function tzTime(tz) {
  return new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
}
function tzParts(tz) {
  // Get y/m/d/weekday in target tz, regardless of system tz
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' });
  const parts = {};
  f.formatToParts(new Date()).forEach(p => parts[p.type] = p.value);
  return parts;
}
function tick() {
  const sg = byId('clock-sg'); if (sg) sg.textContent = tzTime('Asia/Singapore');
  const bne = byId('clock-bne'); if (bne) bne.textContent = tzTime('Australia/Brisbane');
  const de = byId('date');
  if (de) {
    const p = tzParts('Asia/Singapore');
    const dayIdx = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday);
    de.textContent = `${p.year}年${parseInt(p.month)}月${parseInt(p.day)}日 ${zhDays[dayIdx]}`;
  }
}
function setGreeting() {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore', hour: 'numeric', hour12: false }));
  let g = '爷爷，您好！';
  if (h >= 5 && h < 11) g = '爷爷，早上好！';
  else if (h >= 11 && h < 13) g = '爷爷，中午好！';
  else if (h >= 13 && h < 18) g = '爷爷，下午好！';
  else if (h >= 18 && h < 23) g = '爷爷，晚上好！';
  else g = '爷爷，夜深啦';
  const el = byId('greeting'); if (el) el.textContent = g;
}

// ============ LUNAR ============
function loadLunar() {
  const el = byId('lunar'); if (!el) return;
  try {
    if (!window.Lunar) { el.textContent = ''; return; }
    const d = Lunar.fromDate(new Date());
    const year = d.getYearInGanZhi();
    const month = d.getMonthInChinese();
    const day = d.getDayInChinese();
    const zodiac = d.getYearShengXiao();
    let jieqi = '';
    try { jieqi = d.getJieQi() || ''; } catch (e) {}
    if (!jieqi) {
      try {
        const prev = d.getPrevJieQi && d.getPrevJieQi(true);
        if (prev && prev.getName) jieqi = prev.getName();
      } catch (e) {}
    }
    el.textContent = `农历${month}月${day} · ${year}${zodiac}年${jieqi ? ' · ' + jieqi : ''}`;
  } catch (e) { el.textContent = ''; }
}

// ============ WEATHER ============
const WMO = {
  0: ['☀️','晴'], 1: ['🌤️','晴间多云'], 2: ['⛅','多云'], 3: ['☁️','阴'],
  45: ['🌫️','雾'], 48: ['🌫️','霜雾'],
  51: ['🌦️','毛毛雨'], 53: ['🌦️','小雨'], 55: ['🌦️','中雨'],
  56: ['🌧️','冻雨'], 57: ['🌧️','冻雨'],
  61: ['🌧️','小雨'], 63: ['🌧️','中雨'], 65: ['🌧️','大雨'],
  66: ['🌧️','冻雨'], 67: ['🌧️','冻雨'],
  71: ['🌨️','小雪'], 73: ['🌨️','中雪'], 75: ['🌨️','大雪'], 77: ['🌨️','雪粒'],
  80: ['🌦️','阵雨'], 81: ['🌧️','阵雨'], 82: ['⛈️','大阵雨'],
  85: ['🌨️','阵雪'], 86: ['🌨️','大阵雪'],
  95: ['⛈️','雷雨'], 96: ['⛈️','雷雨冰雹'], 99: ['⛈️','强雷雨'],
};
async function loadWeather() {
  const el = byId('weather'); if (!el) return;
  try {
    const cached = JSON.parse(localStorage.getItem('wx') || 'null');
    if (cached && Date.now() - cached.t < 20 * 60 * 1000) { showWx(cached.d); return; }
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=1.29&longitude=103.85&current=temperature_2m,weather_code&timezone=Asia/Singapore');
    const d = await r.json();
    localStorage.setItem('wx', JSON.stringify({ t: Date.now(), d }));
    showWx(d);
  } catch (e) { el.textContent = ''; }
}
function showWx(d) {
  try {
    const t = Math.round(d.current.temperature_2m);
    const code = d.current.weather_code;
    const [emoji, desc] = WMO[code] || ['🌡️', ''];
    byId('weather').textContent = `${emoji} ${t}° ${desc} · 新加坡`;
  } catch (e) { byId('weather').textContent = ''; }
}

// ============ POEM ============
const POEMS = [
  { content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', origin: '李白《静夜思》' },
  { content: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', origin: '孟浩然《春晓》' },
  { content: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', origin: '王之涣《登鹳雀楼》' },
  { content: '鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。', origin: '骆宾王《咏鹅》' },
  { content: '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。', origin: '李绅《悯农》' },
  { content: '空山不见人，但闻人语响。返景入深林，复照青苔上。', origin: '王维《鹿柴》' },
  { content: '红豆生南国，春来发几枝。愿君多采撷，此物最相思。', origin: '王维《相思》' },
  { content: '朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。', origin: '李白《早发白帝城》' },
  { content: '日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。', origin: '李白《望庐山瀑布》' },
  { content: '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。', origin: '柳宗元《江雪》' },
  { content: '松下问童子，言师采药去。只在此山中，云深不知处。', origin: '贾岛《寻隐者不遇》' },
  { content: '慈母手中线，游子身上衣。临行密密缝，意恐迟迟归。谁言寸草心，报得三春晖。', origin: '孟郊《游子吟》' },
  { content: '独在异乡为异客，每逢佳节倍思亲。', origin: '王维《九月九日忆山东兄弟》' },
  { content: '桃花潭水深千尺，不及汪伦送我情。', origin: '李白《赠汪伦》' },
  { content: '海内存知己，天涯若比邻。', origin: '王勃《送杜少府之任蜀州》' },
];
async function loadPoem() {
  const dayIdx = Math.floor(Date.now() / 86400000) % POEMS.length;
  const fallback = POEMS[dayIdx];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch('https://v1.jinrishici.com/all.json', { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw 0;
    const d = await r.json();
    if (d && d.content && d.origin) { showPoem({ content: d.content, origin: d.origin }); return; }
  } catch (e) {}
  showPoem(fallback);
}
function showPoem(p) {
  currentPoem = p;
  byId('poem-content').textContent = p.content;
  byId('poem-origin').textContent = '— ' + p.origin;
}
function speakPoem() {
  if (!currentPoem) return;
  speak(currentPoem.content + '。出自 ' + currentPoem.origin);
}

// ============ TTS ============
const CORS_PROXY = 'https://api.codetabs.com/v1/proxy/?quest=';
function decodeEntities(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
}
async function fetchArticleText(url) {
  const cacheKey = 'art:' + url;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;
  try {
    const r = await fetch(CORS_PROXY + encodeURIComponent(url));
    if (!r.ok) return null;
    const html = await r.text();
    let m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (!m) m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    if (!m) m = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    if (m && m[1].length > 80) {
      const text = decodeEntities(m[1]);
      try { localStorage.setItem(cacheKey, text); } catch (e) {}
      return text;
    }
    const a = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
    if (a) {
      const body = decodeEntities(a[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
      if (body.length > 80) {
        try { localStorage.setItem(cacheKey, body.slice(0, 5000)); } catch (e) {}
        return body.slice(0, 5000);
      }
    }
    return null;
  } catch (e) { return null; }
}
async function speakArticle(btn) {
  if (btn.classList.contains('speaking')) {
    speechSynthesis.cancel();
    btn.classList.remove('speaking');
    currentSpeakingBtn = null;
    return;
  }
  const url = btn.dataset.url;
  const title = btn.dataset.title || '';
  const orig = btn.innerHTML;
  btn.innerHTML = '⏳ 读取中…';
  btn.disabled = true;
  const body = await fetchArticleText(url);
  btn.disabled = false;
  btn.innerHTML = orig;
  const text = body ? (title + '。' + body) : (title + '。（文章内容暂时读不到）');
  speak(text, btn);
}

function speak(text, btn) {
  if (!window.speechSynthesis) { alert('您的浏览器不支持语音朗读'); return; }
  if (currentSpeakingBtn) currentSpeakingBtn.classList.remove('speaking');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  u.pitch = 1;
  u.onend = () => { if (btn) btn.classList.remove('speaking'); currentSpeakingBtn = null; };
  u.onerror = u.onend;
  if (btn) { btn.classList.add('speaking'); currentSpeakingBtn = btn; }
  speechSynthesis.speak(u);
}
function toggleSpeak(btn, text) {
  if (btn.classList.contains('speaking')) {
    speechSynthesis.cancel();
    btn.classList.remove('speaking');
    currentSpeakingBtn = null;
    return;
  }
  speak(text, btn);
}

// ============ WEATHER PAGE (detailed, 2 cities) ============
const WX_CITIES = [
  { id: 'sg',  name: '新加坡',   lat: 1.29,   lon: 103.85 },
  { id: 'bne', name: '布里斯班', lat: -27.47, lon: 153.03 },
];

function degToChineseDir(deg) {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  return dirs[Math.round(((deg || 0) % 360) / 45) % 8];
}

function fmtHm(iso) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

async function loadWeatherPage(force) {
  for (const city of WX_CITIES) {
    const el = byId('wx-' + city.id);
    if (!el) continue;
    const cacheKey = 'wx-detail-' + city.id;
    if (!force) {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.t < 20 * 60 * 1000) {
        renderWeatherCity(city, cached.d);
        continue;
      }
    }
    el.innerHTML = `<div class="loading"><div class="spinner"></div>加载 ${city.name} 天气…</div>`;
    try {
      const url = `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${city.lat}&longitude=${city.lon}` +
        `&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,is_day` +
        `&hourly=temperature_2m,weather_code,precipitation_probability` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max` +
        `&timezone=auto&forecast_days=7`;
      const r = await fetch(url);
      const d = await r.json();
      localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d }));
      renderWeatherCity(city, d);
    } catch (e) {
      el.innerHTML = `<div class="empty-msg">😅 ${city.name} 天气加载不了</div>`;
    }
  }
}

function renderWeatherCity(city, d) {
  const el = byId('wx-' + city.id);
  if (!el || !d || !d.current) return;
  const [emoji, desc] = WMO[d.current.weather_code] || ['🌡️', ''];
  const temp = Math.round(d.current.temperature_2m);
  const feels = Math.round(d.current.apparent_temperature);
  const humidity = Math.round(d.current.relative_humidity_2m);
  const wind = Math.round(d.current.wind_speed_10m);
  const windDir = degToChineseDir(d.current.wind_direction_10m);

  // next 12 hours (skip past-hours)
  const nowMs = Date.now();
  const hourly = [];
  for (let i = 0; i < d.hourly.time.length && hourly.length < 12; i++) {
    const t = new Date(d.hourly.time[i]);
    if (t.getTime() < nowMs - 30 * 60 * 1000) continue;
    const [he] = WMO[d.hourly.weather_code[i]] || ['🌡️'];
    hourly.push({
      time: String(t.getHours()).padStart(2,'0') + ':00',
      emoji: he,
      temp: Math.round(d.hourly.temperature_2m[i]),
      pop: d.hourly.precipitation_probability ? d.hourly.precipitation_probability[i] : 0,
    });
  }

  const zhWeek = ['周日','周一','周二','周三','周四','周五','周六'];
  const daily = d.daily.time.map((day, i) => {
    const dt = new Date(day);
    const [de, dd] = WMO[d.daily.weather_code[i]] || ['🌡️', ''];
    return {
      day: i === 0 ? '今天' : (i === 1 ? '明天' : zhWeek[dt.getDay()]),
      date: `${dt.getMonth()+1}/${dt.getDate()}`,
      emoji: de,
      desc: dd,
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      isToday: i === 0,
    };
  });

  const sr = fmtHm(d.daily.sunrise[0]);
  const ss = fmtHm(d.daily.sunset[0]);

  el.innerHTML = `
    <div class="wx-header">
      <div class="wx-current-emoji">${emoji}</div>
      <div>
        <div class="wx-city-name">${city.name}</div>
        <div class="wx-current-desc">${desc}</div>
      </div>
      <div class="wx-current-temp">${temp}°</div>
    </div>
    <div class="wx-stats">
      <div class="wx-stat"><span class="wx-stat-label">体感</span><span class="wx-stat-value">${feels}°</span></div>
      <div class="wx-stat"><span class="wx-stat-label">湿度</span><span class="wx-stat-value">${humidity}%</span></div>
      <div class="wx-stat"><span class="wx-stat-label">风</span><span class="wx-stat-value">${windDir} ${wind} km/h</span></div>
      <div class="wx-stat"><span class="wx-stat-label">日出 / 日落</span><span class="wx-stat-value">☀ ${sr} · 🌙 ${ss}</span></div>
    </div>
    <h3 class="wx-section-title">⏱ 未来 12 小时</h3>
    <div class="wx-hourly">
      ${hourly.map(h => `
        <div class="wx-hourly-item">
          <div class="wx-hourly-time">${h.time}</div>
          <div class="wx-hourly-emoji">${h.emoji}</div>
          <div class="wx-hourly-temp">${h.temp}°</div>
          ${h.pop >= 30 ? `<div class="wx-hourly-pop">💧${h.pop}%</div>` : ''}
        </div>`).join('')}
    </div>
    <h3 class="wx-section-title">📅 未来 7 天</h3>
    <div class="wx-daily">
      ${daily.map(dd => `
        <div class="wx-daily-item ${dd.isToday ? 'today' : ''}">
          <span class="wx-daily-day">${dd.day}<span class="wx-daily-date">${dd.date}</span></span>
          <span class="wx-daily-emoji">${dd.emoji}</span>
          <span class="wx-daily-desc">${dd.desc}</span>
          <span class="wx-daily-min">${dd.min}°</span>
          <span class="wx-daily-max">${dd.max}°</span>
        </div>`).join('')}
    </div>`;
}

// ============ NEWS ============
// 8world (Mediacorp) serves Simplified Chinese news directly. Categories:
// 176=新加坡, 186=中国/大中华, 191=国际, 201=体育, 231=娱乐
const W8 = 'https://www.8world.com/api/v1/rss-outbound-feed?_format=xml&category=';
const NEWS_CATEGORIES = [
  { id: 'sg',     label: '🇸🇬 新加坡', feed: W8 + '176' },
  { id: 'cn',     label: '🇨🇳 中国',   feed: W8 + '186' },
  { id: 'world',  label: '🌏 国际',     feed: W8 + '191' },
  { id: 'ent',    label: '🎬 娱乐',     feed: W8 + '231' },
  { id: 'sports', label: '🏀 体育',     feed: W8 + '201' },
];

function loadNewsTabs() {
  newsLoaded = true;
  byId('news-tabs').innerHTML = NEWS_CATEGORIES.map(c =>
    `<button class="tab ${c.id === currentNewsCat ? 'active' : ''}" data-cat="${c.id}" data-action="switch-news">${c.label}</button>`
  ).join('');
  loadNewsCategory(currentNewsCat);
}

function switchNews(catId) {
  currentNewsCat = catId;
  $$('#news-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.cat === catId));
  loadNewsCategory(catId);
}

function refreshNews() {
  localStorage.removeItem('news-v2-' + currentNewsCat);
  loadNewsCategory(currentNewsCat);
}

function skeletonGrid(n) {
  return `<div class="skeleton-grid">${Array(n).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skel skel-thumb"></div>
      <div>
        <div class="skel skel-line title"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line short"></div>
      </div>
    </div>`).join('')}</div>`;
}

async function loadNewsCategory(catId) {
  const cat = NEWS_CATEGORIES.find(c => c.id === catId);
  const content = byId('news-content');
  content.innerHTML = skeletonGrid(6);

  const cacheKey = `news-v2-${catId}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
  if (cached && Date.now() - cached.t < 10 * 60 * 1000) {
    renderNews(cached.items);
    return;
  }
  try {
    const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(cat.feed)}`;
    const r = await fetch(api);
    const data = await r.json();
    if (data.status !== 'ok' || !data.items) throw new Error('feed failed');
    // Require Chinese characters in title (Google feeds leak English)
    const filtered = data.items.filter(it => (it.title.match(/[\u4e00-\u9fff]/g) || []).length >= 3);
    const items = filtered.length ? filtered : data.items;
    localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), items }));
    renderNews(items);
  } catch (e) {
    content.innerHTML = `<div class="empty-msg">😅 新闻暂时加载不了，请检查网络后再试。<br><br>
      <button class="back-btn" data-action="retry-news">重新加载</button></div>`;
  }
}

function renderNews(items) {
  const content = byId('news-content');
  if (!items.length) { content.innerHTML = `<div class="empty-msg">暂无新闻</div>`; return; }
  content.innerHTML = `<div class="news-list">${items.map(it => {
    const img = pickImage(it);
    const snippet = stripHtml(it.description || it.content || '').slice(0, 160);
    const source = extractSource(it);
    const when = formatDate(it.pubDate);
    const speakText = (it.title + '。' + snippet);
    return `
      <article class="news-card">
        <div class="news-thumb">${img ? `<img src="${escAttr(img)}" data-broken="📰">` : '📰'}</div>
        <div class="news-body">
          <h3 class="news-title"><a href="${escAttr(it.link)}" target="_blank" rel="noopener">${escapeHtml(it.title)}</a></h3>
          <p class="news-snippet">${escapeHtml(snippet)}</p>
          <div class="news-meta">
            <span class="news-source">${escapeHtml(source)}</span>
            <span>${when}</span>
          </div>
          <div class="news-actions">
            <button class="news-btn" data-action="speak-article" data-url="${escAttr(it.link)}" data-title="${escAttr(it.title)}">🔊 读给我听</button>
            <a class="news-btn primary" href="${escAttr(it.link)}" target="_blank" rel="noopener">📖 阅读全文 →</a>
          </div>
        </div>
      </article>`;
  }).join('')}</div>`;
}

function pickImage(it) {
  if (it.thumbnail && it.thumbnail.startsWith('http')) return it.thumbnail;
  if (it.enclosure && it.enclosure.link) return it.enclosure.link;
  const html = (it.description || '') + (it.content || '');
  const m = html.match(/<img[^>]+src="([^"]+)"/);
  return m ? m[1] : null;
}
function extractSource(it) {
  if (it.author) return it.author;
  const m = (it.title || '').match(/ - ([^-]+)$/);
  if (m) return m[1].trim();
  try { return new URL(it.link).hostname.replace('www.',''); } catch(e) { return '新闻'; }
}
function formatDate(s) {
  if (!s) return '';
  const d = new Date(s); if (isNaN(d)) return '';
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 60) return `${Math.max(1,Math.floor(diff))} 分钟前`;
  if (diff < 1440) return `${Math.floor(diff/60)} 小时前`;
  return `${d.getMonth()+1}月${d.getDate()}日`;
}

// ============ TV (channel-style, YouTube playlist embeds) ============
// Each channel maps to a YouTube playlist ID. Embedding the playlist lets
// YouTube handle the video list + autoplay-next natively (always reliable).
// For favs/recents we have our own per-video list and next/prev logic.
const TV_CATEGORIES = [
  { emoji: '📡', label: 'CCTV 新闻',   sub: '每天更新 · 央视新闻',    playlist: 'UUcLK3j-XWdGBnt5bR9NJHaQ' },
  { emoji: '🗞️', label: '新加坡新闻', sub: '每天更新 · 联合早报',    playlist: 'UUrbQxu0YkoVWu2dw5b1MzNg' },
  { emoji: '🎬', label: '最新华语剧', sub: '每天更新 · 腾讯剧场',    playlist: 'UU3PKcYXUAhao3p4kuNS4_9w' },
  { emoji: '🌸', label: '邓丽君',     sub: '华语经典金曲',            playlist: 'PLfH5Rfi-dNjH1BZ55CXcKfmKiTY2LCz7q' },
  { emoji: '🎭', label: '新加坡老剧', sub: '怀旧电视剧',              playlist: 'PLORWJtExPDfmEf7wdONGTNo0WC2r9_GRj' },
  { emoji: '🎤', label: '闽南老歌',   sub: '福建话经典',              playlist: 'PL9Y-V6M0Lg3aFa0ehL_kf8GQTo47Tzwqg' },
  { emoji: '🎎', label: '歌仔戏',     sub: '传统戏曲',                playlist: 'PLgHyVyWY1emNNl6SeqXtUYSOVod7E2Vdj' },
  { emoji: '🎙️', label: '相声',       sub: '郭德纲 经典笑话',         playlist: 'PLkwpUP-boUtVphBk1RKMO4dbQ6V7Q3nUH' },
  { emoji: '🏔️', label: '航拍中国',   sub: '中国山水纪录片',          playlist: 'PLOHG5PB2LOchMwZqA4TomZ9ZfsUIhiUhy' },
  { emoji: '🎧', label: '听书',       sub: '三国演义 · 单田芳',       playlist: 'PLYJGfwESpAk7r3YhqGLF8Qdl-F8azpGIq' },
  { emoji: '🎪', label: '潮剧',       sub: '潮州戏曲 · 全剧',          playlist: 'PL_VpMcbu2pqBNhl-vcQNo6_T457a2-TQL' },
];

let currentChannel = null;   // 0..n, 'favs', 'recents'
let currentMode = null;      // 'playlist' | 'local'
let currentVideos = [];      // only used in 'local' mode
let currentVideoIdx = 0;

// YouTube IFrame API — initialized by the async script tag
let ytPlayer = null;
let ytReady = false;
let pendingLoad = null;  // queued action if player not ready yet

window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('tv-player', {
    height: '100%',
    width: '100%',
    host: 'https://www.youtube-nocookie.com',
    playerVars: { rel: 0, autoplay: 1, modestbranding: 1, playsinline: 1 },
    events: {
      onReady: function () {
        ytReady = true;
        if (pendingLoad) { pendingLoad(); pendingLoad = null; }
      }
    }
  });
};

function loadTvGrid() {
  tvLoaded = true;
  renderChannels();
}

function renderChannels() {
  const fav = getFavs();
  const rec = getRecents();
  const main = TV_CATEGORIES.map((c, i) => `
    <button class="channel-btn ${currentChannel === i ? 'active' : ''}" data-action="select-channel" data-ch="${i}">
      <span class="channel-num">${i + 1}</span>
      <span class="channel-emoji">${c.emoji}</span>
      <span class="channel-name">${c.label}</span>
    </button>`).join('');
  let quick = '';
  if (fav.length) {
    quick += `<button class="channel-btn quick ${currentChannel==='favs'?'active':''}" data-action="select-special" data-which="favs">
      <span class="channel-num">❤</span>
      <span class="channel-name">我的收藏 (${fav.length})</span>
    </button>`;
  }
  if (rec.length) {
    quick += `<button class="channel-btn quick ${currentChannel==='recents'?'active':''}" data-action="select-special" data-which="recents">
      <span class="channel-num">🕐</span>
      <span class="channel-name">最近看过 (${rec.length})</span>
    </button>`;
  }
  byId('channels').innerHTML = main + (quick ? `<div class="channel-sep"></div>${quick}` : '');
}

function selectChannel(i) {
  const cat = TV_CATEGORIES[i];
  currentChannel = i;
  currentMode = 'playlist';
  localStorage.setItem('last-channel', String(i));
  renderChannels();
  byId('list-title').textContent = `🎬 ${cat.emoji} ${cat.label}`;
  byId('channel-videos').style.display = 'none';
  byId('screen-off').style.display = 'none';
  byId('now-playing').innerHTML = `
    <span class="np-label">频道 ${i + 1}</span>
    <span class="np-title">${escapeHtml(cat.label)} · ${escapeHtml(cat.sub)}</span>
  `;
  flashChannelBadge(`CH ${String(i + 1).padStart(2,'0')} · ${cat.label}`);
  const loadFn = () => ytPlayer.loadPlaylist({ list: cat.playlist, listType: 'playlist', index: 0 });
  if (ytReady) loadFn(); else pendingLoad = loadFn;
}

function flashChannelBadge(text) {
  const b = byId('channel-badge');
  if (!b) return;
  b.textContent = text;
  b.classList.remove('visible');
  void b.offsetWidth;  // reset animation
  b.classList.add('visible');
}

function selectSpecial(which) {
  const list = which === 'favs' ? getFavs() : getRecents();
  if (!list.length) return;
  currentChannel = which;
  currentMode = 'local';
  localStorage.setItem('last-channel', which);
  currentVideos = list.map(r => ({ id: r.id, title: r.title || '视频', thumb: r.thumb }));
  currentVideoIdx = 0;
  renderChannels();
  byId('list-title').textContent = which === 'favs' ? '❤️ 我的收藏' : '🕐 最近看过';
  byId('channel-videos').style.display = '';
  flashChannelBadge(which === 'favs' ? '❤️ 我的收藏' : '🕐 最近看过');
  playCurrentLocal();
  renderLocalList();
}

function playCurrentLocal() {
  const it = currentVideos[currentVideoIdx];
  if (!it) return;
  byId('screen-off').style.display = 'none';
  const fav = isFav(it.id);
  byId('now-playing').innerHTML = `
    <span class="np-label">正在播放</span>
    <span class="np-title">${escapeHtml(it.title)}</span>
    <button class="np-heart ${fav?'active':''}" data-action="toggle-fav-now" data-id="${it.id}" title="${fav?'取消收藏':'收藏'}">${fav?'❤️':'🤍'}</button>
  `;
  pushRecent(it.id, it.title, it.thumb);
  updatePlayingThumb();
  const loadFn = () => ytPlayer.loadVideoById(it.id);
  if (ytReady) loadFn(); else pendingLoad = loadFn;
}

function updatePlayingThumb() {
  $$('#channel-videos .video-thumb').forEach((el, i) => {
    el.classList.toggle('playing', i === currentVideoIdx);
  });
}

function renderLocalList() {
  byId('channel-videos').innerHTML = currentVideos.map((it, i) => {
    const thumb = it.thumb || `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`;
    return `
      <div class="video-thumb ${i === currentVideoIdx ? 'playing' : ''}" data-action="play-at" data-idx="${i}">
        <img src="${escAttr(thumb)}" data-broken="">
        <div class="v-title">${escapeHtml(it.title)}</div>
      </div>`;
  }).join('');
}

function playAt(idx) {
  if (currentMode !== 'local') return;
  if (!currentVideos[idx]) return;
  currentVideoIdx = idx;
  playCurrentLocal();
}

function nextVideo() {
  if (currentMode === 'playlist') {
    if (ytReady && ytPlayer.nextVideo) ytPlayer.nextVideo();
  } else if (currentMode === 'local' && currentVideos.length) {
    currentVideoIdx = (currentVideoIdx + 1) % currentVideos.length;
    playCurrentLocal();
  }
}
function prevVideo() {
  if (currentMode === 'playlist') {
    if (ytReady && ytPlayer.previousVideo) ytPlayer.previousVideo();
  } else if (currentMode === 'local' && currentVideos.length) {
    currentVideoIdx = (currentVideoIdx - 1 + currentVideos.length) % currentVideos.length;
    playCurrentLocal();
  }
}

function customSearch() {
  const input = byId('tv-search');
  const q = input.value.trim();
  if (!q) return;
  window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank', 'noopener');
  input.value = '';
}

function onShowTv() {
  if (currentChannel !== null) { renderChannels(); return; }
  const saved = localStorage.getItem('last-channel');
  if (saved !== null && saved !== '') {
    const n = parseInt(saved);
    if (!isNaN(n) && n >= 0 && n < TV_CATEGORIES.length) { selectChannel(n); return; }
    if (saved === 'favs' && getFavs().length) { selectSpecial('favs'); return; }
    if (saved === 'recents' && getRecents().length) { selectSpecial('recents'); return; }
  }
  selectChannel(0);
}


// ============ FAVORITES + RECENTS ============
function getFavs() { return JSON.parse(localStorage.getItem('favs') || '[]'); }
function setFavs(v) { localStorage.setItem('favs', JSON.stringify(v.slice(0, 50))); }
function isFav(id) { return getFavs().some(f => f.id === id); }
function toggleFavNow(id) {
  const favs = getFavs();
  const i = favs.findIndex(f => f.id === id);
  if (i >= 0) favs.splice(i, 1);
  else {
    const it = currentVideos[currentVideoIdx];
    const title = it ? (it.title || '') : '';
    const thumb = (it && it.thumbnail) || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
    favs.unshift({ id, title, thumb, t: Date.now() });
  }
  setFavs(favs);
  // Refresh now-playing heart + sidebar quick channels
  const np = byId('now-playing');
  if (np) {
    const heart = np.querySelector('.np-heart');
    if (heart) {
      const active = isFav(id);
      heart.classList.toggle('active', active);
      heart.textContent = active ? '❤️' : '🤍';
    }
  }
  renderChannels();
}
function getRecents() { return JSON.parse(localStorage.getItem('recents') || '[]'); }
function pushRecent(id, title, thumb) {
  if (!id) return;
  let list = getRecents().filter(r => r.id !== id);
  list.unshift({ id, title: title || '', thumb: thumb || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, t: Date.now() });
  list = list.slice(0, 12);
  localStorage.setItem('recents', JSON.stringify(list));
}

// ============ GAMES ============
// These sites mostly allow iframe embedding. For ones that refuse (X-Frame-Options), user has "新窗口打开" button.
const GAMES = [
  { emoji: '♟️', label: '中国象棋', sub: '和电脑下棋', url: 'https://www.playok.com/en/xiangqi/' },
  { emoji: '🀄', label: '麻将',     sub: '打麻将',       url: 'https://www.playok.com/en/mahjong/' },
  { emoji: '🔢', label: '数独',     sub: '动动脑筋',     url: 'https://sudoku.com/zh/' },
  { emoji: '🃏', label: '纸牌接龙', sub: '单人纸牌',     url: 'https://www.solitaired.com/klondike' },
  { emoji: '⚫', label: '五子棋',   sub: '五子连珠',     url: 'https://www.playok.com/en/gomoku/' },
  { emoji: '🧩', label: '麻将连连看', sub: '消除配对',   url: 'https://www.mahjong-game.com/' },
];
function loadGamesGrid() {
  gamesLoaded = true;
  byId('games-grid').innerHTML = GAMES.map((g, i) => `
    <div class="tv-card game-card" data-action="open-game" data-index="${i}">
      <div class="s-emoji">${g.emoji}</div>
      <div class="s-label">${g.label}</div>
      <div class="s-sub">${g.sub}</div>
    </div>`).join('');
}
function openGame(i) {
  const g = GAMES[i];
  openModal(`🎮 ${g.label}`, '', true, false);
  byId('modal-actions').innerHTML = `
    <a class="fav-btn" href="${g.url}" target="_blank" rel="noopener" style="text-decoration:none;background:var(--jade);box-shadow:0 4px 0 #1d4d3e">⧉ 新窗口打开</a>
    <button class="close-btn" data-action="close-modal">✕ 关闭</button>
  `;
  byId('modal-body').innerHTML = `
    <div class="game-iframe-wrap" style="position:relative">
      <iframe class="game-frame" src="${g.url}" allow="fullscreen"></iframe>
      <div class="iframe-hint" style="margin-top:12px;color:#FFF6E0;font-size:1rem;text-align:center">
        如果下面是空白的，点上面的 <b>⧉ 新窗口打开</b> 按钮
      </div>
    </div>`;
}

// ============ MODAL ============
function openModal(title, bodyHtml, single, resetActions=true) {
  byId('modal-title').textContent = title;
  const body = byId('modal-body');
  body.classList.toggle('single', !!single);
  body.innerHTML = bodyHtml;
  if (resetActions !== false) {
    byId('modal-actions').innerHTML = `<button class="close-btn" data-action="close-modal">✕ 关闭</button>`;
  }
  byId('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  const m = byId('modal');
  if (!m.classList.contains('open')) return;
  m.classList.remove('open');
  byId('modal-body').innerHTML = '';
  document.body.style.overflow = '';
  if (currentSpeakingBtn) { speechSynthesis.cancel(); currentSpeakingBtn.classList.remove('speaking'); currentSpeakingBtn = null; }
}

// ============ EVENT DELEGATION ============
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'show') { show(el.dataset.page); }
  else if (action === 'change-font') { changeFont(parseFloat(el.dataset.delta)); }
  else if (action === 'speak-poem') { speakPoem(); }
  else if (action === 'speak') { toggleSpeak(el, el.dataset.text); }
  else if (action === 'speak-article') { speakArticle(el); }
  else if (action === 'switch-news') { switchNews(el.dataset.cat); }
  else if (action === 'refresh-news') { refreshNews(); }
  else if (action === 'retry-news') { loadNewsCategory(currentNewsCat); }
  else if (action === 'select-channel') { selectChannel(parseInt(el.dataset.ch)); }
  else if (action === 'select-special') { selectSpecial(el.dataset.which); }
  else if (action === 'play-at') { playAt(parseInt(el.dataset.idx)); }
  else if (action === 'prev-video') { prevVideo(); }
  else if (action === 'next-video') { nextVideo(); }
  else if (action === 'toggle-fav-now') { toggleFavNow(el.dataset.id); }
  else if (action === 'open-game') { openGame(parseInt(el.dataset.index)); }
  else if (action === 'close-modal') { closeModal(); }
  else if (action === 'refresh-weather-page') { loadWeatherPage(true); }
});

// Replace broken thumbnail images with an emoji fallback
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && t.dataset.broken !== undefined) {
    t.replaceWith(document.createTextNode(t.dataset.broken || '📰'));
  }
}, true);

// Form submit for custom search
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-action="custom-search-form"]');
  if (form) { e.preventDefault(); customSearch(); }
});

// Enter / Space activates any focused [data-action] element (a11y for div-based "buttons")
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[data-action][tabindex]');
  if (!el || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
  e.preventDefault();
  el.click();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  const modalOpen = byId('modal').classList.contains('open');
  if (e.key === 'Escape') {
    if (modalOpen) closeModal();
    else if (!byId('page-home').classList.contains('active')) show('home');
    return;
  }
  if (modalOpen) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  const homeActive = byId('page-home').classList.contains('active');
  const tvActiveNow = byId('page-tv').classList.contains('active');
  if (homeActive) {
    if (e.key === '1') show('news');
    if (e.key === '2') show('tv');
    if (e.key === '3') show('games');
    if (e.key === '4') show('weather');
  } else if (tvActiveNow) {
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); selectChannel(parseInt(e.key) - 1); }
    else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') { e.preventDefault(); nextVideo(); }
    else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') { e.preventDefault(); prevVideo(); }
  }
  if (e.key === '+' || e.key === '=') changeFont(0.05);
  if (e.key === '-' || e.key === '_') changeFont(-0.05);
});

// ============ INIT ============
function init() {
  tick();
  setInterval(tick, 30 * 1000);
  setGreeting();
  setInterval(setGreeting, 5 * 60 * 1000);
  loadLunar();
  loadWeather();
  setInterval(loadWeather, 20 * 60 * 1000);
  loadPoem();
  // Auto-refresh news every 10 min when the news page is visible
  setInterval(() => {
    if (byId('page-news').classList.contains('active') && newsLoaded) {
      localStorage.removeItem('news-v2-' + currentNewsCat);
      loadNewsCategory(currentNewsCat);
    }
  }, 10 * 60 * 1000);
  const h = location.hash.replace('#','');
  if (pages.includes(h)) show(h);
  // Re-route on browser back/forward and manual hash edits
  window.addEventListener('hashchange', () => {
    const next = location.hash.replace('#','') || 'home';
    const cur = pages.find(p => byId('page-' + p).classList.contains('active'));
    if (next !== cur && pages.includes(next)) show(next);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
