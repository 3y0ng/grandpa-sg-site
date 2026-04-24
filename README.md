# 爷爷的小天地 · grandpa-sg-site

A zero-dependency static site built for a Singaporean grandpa. News, TV, games, and weather in Simplified Chinese, laptop-first, keyboard-navigable, big fonts for tired eyes.

**Live:** https://3y0ng.github.io/grandpa-sg-site/

---

## What's in it

- **📰 新闻** — 5 Mandarin news feeds from 8world (Mediacorp SG) with inline thumbnails + full-article TTS read-aloud.
- **📺 电视** — 11 YouTube-playlist channels in a wood-bezel TV cabinet (Teresa Teng, 新加坡老剧, 闽南老歌, 歌仔戏, 相声, 航拍中国, 听书, 潮剧, CCTV 新闻, 联合早报, 腾讯剧场). Remote-style ⏮⏭ controls via YouTube IFrame API. Favorites, recents, continue-watching, keyboard channel numbers 1-9.
- **🎮 游戏** — 6 embedded games (中国象棋, 麻将, 数独, 纸牌接龙, 五子棋, 麻将连连看).
- **🌤️ 天气** — Open-Meteo for Singapore + Brisbane side-by-side: current + 12-hour hourly + 7-day forecast with sunrise/sunset, humidity, wind direction in Chinese.
- **Topbar** — SG + Brisbane clocks, weather, gregorian + lunar date (农历 + 节气 + 干支 + 生肖), A+/A- font scaling that persists.
- **Home** — Marina Bay hero, 4 keyboard-numbered tiles (`1` 2 3 4), 今日诗词 card (jinrishici API with 15 classic-poem fallback), `🔊 念给我听` button reads the poem aloud.

---

## Running it

No build step. Just static HTML + one JS file.

```bash
cd grandpa
python3 -m http.server 8080
```

Open http://localhost:8080. Hard-refresh (⌘⇧R / Ctrl+F5) if you see stale cache.

Don't open via `file://` — the news, weather, and TV APIs will CORS-block.

---

## Deploying updates

GitHub Pages auto-redeploys on push:

```bash
# edit stuff...
git add -A && git commit -m "..." && git push
```

~30 seconds later the live site reflects. If changes don't show: bump `<script src="app.js?v=N">` in `index.html` to bust the browser cache.

---

## Architecture

- `index.html` — structure, inline CSS (CSS variables for the full warm-cream + red + gold + jade palette), no inline `onclick=` (CSP-safe)
- `app.js` — all logic, uses event delegation on `[data-action]` attributes; YouTube IFrame API for TV; `Intl.DateTimeFormat` for SG-local dates
- `photos/` — optional; drop `1.jpg`, `2.jpg`, … to populate later if we ever re-add a family tile

### External services (all free, no keys)

| Service | Purpose |
|---|---|
| [Open-Meteo](https://open-meteo.com) | Weather (SG + BNE, forecast) |
| [jinrishici.com](https://v1.jinrishici.com) | Daily Chinese poem |
| [8world.com RSS](https://www.8world.com) | Mandarin SG news, piped through api.rss2json.com |
| [api.codetabs.com](https://api.codetabs.com) | CORS proxy to fetch article bodies for TTS |
| [YouTube IFrame API](https://developers.google.com/youtube/iframe_api) | TV channel playback, playlist navigation |
| [lunar-javascript](https://github.com/6tail/lunar-javascript) | 农历, 节气, 干支, 生肖 |
| [Google Fonts](https://fonts.google.com) | Noto Sans SC, Noto Serif SC, Ma Shan Zheng |
| [Pexels](https://www.pexels.com) | Marina Bay hero |

---

## Keyboard shortcuts

| Key | Where | Does |
|---|---|---|
| `1` `2` `3` `4` | home | jump to 新闻 / 电视 / 游戏 / 天气 |
| `1`–`9` | TV page | flip to channel N |
| `←` `→` | TV page | prev / next video |
| `Esc` | any page | close modal, or return home |
| `+` `−` | any page | resize all text |

---

## Built with

Claude Code + gstack (`/qa`, `/design-review`, `/cso`). The current version was audited for functional bugs, visual consistency, and security — the commit history (`git log --oneline`) shows each fix.

Made for 爷爷 ❤️
