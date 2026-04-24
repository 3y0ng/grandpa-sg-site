# 爷爷的小天地 · grandpa-sg-site

A little site I made for my grandpa.

**Live:** https://3y0ng.github.io/grandpa-sg-site/

## Why

My grandpa lives in Singapore. I'm in Brisbane. He's in his 80s, speaks Mandarin and Hokkien, and finds computers stressful. My dad mentioned he's been getting bored during the day, so I put this together.

The idea is that it should feel closer to switching on the TV than using a browser. He opens one bookmark and everything he might want is right there, in big Chinese text, on four buttons he can't miss.

## What's inside

- **📰 新闻** — Mandarin news from 8world. Every article has a 🔊 button that reads it aloud in Chinese.
- **📺 电视** — 11 channels styled as an old wood-cabinet TV. CCTV, 联合早报, Teresa Teng, 新加坡老剧, 闽南老歌, 歌仔戏, 相声, 航拍中国, 听书, 潮剧. Old-school ⏮⏭ remote buttons. Keyboard `1`–`9` flips channels.
- **🎮 游戏** — Chinese chess, mahjong, sudoku, solitaire, gomoku, 连连看.
- **🌤️ 天气** — Singapore and Brisbane side by side. He can see what it's like where I am.
- **Topbar** — two clocks, live weather, the 农历 date with 节气 and 生肖, and 字大/字小 buttons to resize everything.
- **Home** — Marina Bay photo, four tiles, and a classical Chinese poem that rotates daily.

Everything saves to localStorage. Favorites, watch history, last channel, font size. When he comes back the next day, the TV is on the channel he was watching.

## Running it

```bash
cd grandpa
python3 -m http.server 8080
```

Open http://localhost:8080. Don't open the file directly — CORS will block the news and weather APIs.

## Deploying

GitHub Pages picks up any push to `main`:

```bash
git add -A && git commit -m "..." && git push
```

Live in about 30 seconds. If the browser is showing a stale version, bump `app.js?v=N` in `index.html`.

## How it works

Two files. `index.html` has the structure and CSS. `app.js` has everything else. No build tools, no package.json, no framework.

External services, all free and keyless:

| | |
|---|---|
| [Open-Meteo](https://open-meteo.com) | Weather |
| [jinrishici](https://v1.jinrishici.com) | Daily poem |
| [8world](https://www.8world.com) via [rss2json](https://rss2json.com) | News |
| [codetabs proxy](https://api.codetabs.com) | Article text for TTS |
| [YouTube IFrame API](https://developers.google.com/youtube/iframe_api) | TV channels |
| [lunar-javascript](https://github.com/6tail/lunar-javascript) | 农历, 节气 |
| [Google Fonts](https://fonts.google.com) | Noto Sans SC, Noto Serif SC, Ma Shan Zheng |
| [Pexels](https://www.pexels.com) | Marina Bay hero |

## Keyboard shortcuts

Mostly for me during development. Grandpa clicks.

| Key | Where | Does |
|---|---|---|
| `1` `2` `3` `4` | home | jump to a section |
| `1`–`9` | TV | switch channel |
| `←` `→` | TV | prev / next video |
| `Esc` | anywhere | back out |
| `+` `−` | anywhere | resize text |

## Built with

Claude Code and [gstack](https://github.com/gstack-cli/gstack). The commit history has every bug fix, design tweak, and security finding as its own commit.
