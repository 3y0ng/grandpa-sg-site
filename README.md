# 爷爷的小天地 · grandpa-sg-site

A little corner of the internet I built for my grandpa.

**Live:** https://3y0ng.github.io/grandpa-sg-site/

## Why

My grandpa is in Singapore. I'm in Brisbane. He's 80-something, speaks Mandarin and Hokkien, and, like a lot of people his age, finds modern tech stressful. Apps ask him to create accounts. Browsers autocomplete passwords he didn't set. YouTube throws him into a rabbit hole of videos he didn't ask for. He told my mum he gets bored during the day, so I wanted to make something for him that felt more like switching on the TV than operating a computer.

This site is that. One URL. Four big tiles. No login. No settings page. No "click here to subscribe". If he can open Chrome and click a bookmark, he can use everything here.

## What it tries to do

- **Feel like a TV, not a browser.** The 电视 page is a proper wood-bezel TV with a remote. Channel 1 is the news. Channel 4 is Teresa Teng. ⏮ and ⏭ skip to the next video like an old VCR.
- **Get out of his way.** No modals asking him to sign up. No cookie banners to dismiss. No loading spinners longer than a heartbeat. No English menus he can't read.
- **Respect his eyesight.** Minimum 22px body text. The 字+ / 字− buttons in the corner resize everything. The tiles are the size of his palm.
- **Be culturally at home.** Warm cream background, Chinese red and gold accents, Ma Shan Zheng brush calligraphy for the 今日诗词 card, 农历 date with 节气 showing "谷雨" and 生肖 showing "丙午马年". Marina Bay hero photo so the first thing he sees is a view he knows.
- **Give him things to do.** News he can read (or have read to him via the 🔊 button), classical poems, TV channels across his favorite genres, Chinese chess / mahjong / sudoku, and a weather forecast that compares his city to mine so he knows what it's like where his grandson is.

Everything on the page is something I think he'd actually use.

## What's inside

- **📰 新闻** — 5 Mandarin news feeds from 8world (Singapore's Mediacorp). Each article card has a `🔊 读给我听` button that fetches the full article body via a CORS proxy and reads it aloud in Chinese.
- **📺 电视** — 11 YouTube-playlist "channels": CCTV 新闻, 联合早报, 最新华语剧, 邓丽君, 新加坡老剧, 闽南老歌, 歌仔戏, 相声 (郭德纲), 航拍中国, 听书 (三国演义), 潮剧. Remote ⏮/⏭ controls use the YouTube IFrame API. Favorites, recents, and continue-watching across sessions. Press `1`–`9` on the keyboard to flip channels.
- **🎮 游戏** — 6 embedded games: 中国象棋, 麻将, 数独, 纸牌接龙, 五子棋, 麻将连连看.
- **🌤️ 天气** — Singapore + Brisbane side-by-side, so he can see it's chilly where I am when it's raining where he is. Current conditions, 12-hour hourly forecast, 7-day outlook, sunrise/sunset, humidity, wind direction (all in Chinese).
- **Topbar** — two clocks (新加坡 + 布里斯班), live weather, gregorian + lunar date with 节气, 字+/字− controls that persist.
- **Home** — Marina Bay hero photo, 4 big tiles with numbered keyboard hints, and a rotating 今日诗词 card with a classical Chinese poem he can read or have read aloud.

## Running it locally

No build step. Just static HTML and one JS file.

```bash
cd grandpa
python3 -m http.server 8080
```

Open http://localhost:8080. Hard-refresh (⌘⇧R / Ctrl+F5) if the cache looks stale.

Don't open via `file://` — the news, weather, and TV APIs will CORS-block.

## Deploying updates

GitHub Pages auto-redeploys on push:

```bash
git add -A && git commit -m "..." && git push
```

~30 seconds later the live site updates. If a change doesn't show up, bump `<script src="app.js?v=N">` in `index.html` to bust the browser cache.

## Architecture

- `index.html` — structure, inline CSS (CSS variables for the warm-cream + red + gold + jade palette), no inline `onclick=` (CSP-safe)
- `app.js` — all logic: YouTube IFrame API for TV, `Intl.DateTimeFormat` for SG-local dates regardless of the viewer's timezone, `speechSynthesis` for TTS, localStorage for favorites/recents/continue-watching
- `photos/` — empty, kept for a future family photo tile

### External services (all free, no API keys)

| Service | Used for |
|---|---|
| [Open-Meteo](https://open-meteo.com) | Weather forecasts (SG + Brisbane) |
| [jinrishici.com](https://v1.jinrishici.com) | Daily classical Chinese poem |
| [8world.com RSS](https://www.8world.com) | Mandarin Singapore news (via api.rss2json.com) |
| [api.codetabs.com](https://api.codetabs.com) | CORS proxy to fetch article bodies for TTS |
| [YouTube IFrame API](https://developers.google.com/youtube/iframe_api) | TV channel playback + navigation |
| [lunar-javascript](https://github.com/6tail/lunar-javascript) | 农历, 节气, 干支, 生肖 |
| [Google Fonts](https://fonts.google.com) | Noto Sans SC, Noto Serif SC, Ma Shan Zheng |
| [Pexels](https://www.pexels.com) | Marina Bay hero image |

## Keyboard shortcuts

Grandpa's not going to use these but they're here for sanity during dev:

| Key | Where | Does |
|---|---|---|
| `1` `2` `3` `4` | home | jump to 新闻 / 电视 / 游戏 / 天气 |
| `1`–`9` | TV page | flip to channel N |
| `←` `→` | TV page | prev / next video |
| `Esc` | any page | close modal, or return home |
| `+` `−` | any page | resize all text |

## Built with

Claude Code + [gstack](https://github.com/gstack-cli/gstack) (`/qa`, `/design-review`, `/cso`). The commit history shows every bug fix, design tweak, and security finding as its own atomic commit.

---

Made for 爷爷 ❤️
