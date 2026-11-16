# LTN TV

Love Thy Nerd, always on. A TV-style player for Windows that carries only the Love Thy Nerd channels:

| Channel | What it is |
|---|---|
| 1 LTN NEWS | Who is live, plus the newest from Twitch, lovethynerd.com and YouTube, over background music |
| 2 LTN DAILY BIBLE | The LTN Daily Audio Bible playlist, played through in order |
| 3 LTN PLAYS GAMES | The Twitch stream when we are live; the LTN Plays Games YouTube channel on shuffle when we are not, with the next stream's time in the corner |
| 4-15 | One channel per show: Love Thy Nerd, NCMU Podcast, Nerd History, RPG Rundown, The Pull List, Save & Continue, Christian Board Gamers, Faith & Fandom, Satellite Stories, Two Words, Church Nerds, Bible Thump |

The show channels are always on and shuffled, and the same for everyone: what is playing, and how far in, depends only on the clock. They play full videos only (no Shorts) with captions off.

## Install

Download from the latest release:
- `LTN-TV-Setup-*.exe` installs it (choose the folder; it adds desktop and Start menu shortcuts you can pin to the taskbar).
- `LTN-TV-Portable-*.exe` runs without installing.

Windows may show "Windows protected your PC" because the app isn't code-signed yet: click **More info**, then **Run anyway**.

## Keys

Up/Down channel, 0-9 go to a channel, **Enter** or **G** guide, **H** favorite, **V** favorites only, **S** settings, Left/Right volume, **M** mute, **F** fullscreen, Esc asks whether to close the app (as does the window's X), **Q** quit. Mouse wheel changes channel.

In the guide: arrows move, PgUp/PgDn jump five channels, **N** returns to now, Enter watches.

## Building

The app source is in `src/`. Build from a short folder path (the NSIS installer fails on very long ones):

```
cd src
npm install
npm run dist
```

This writes `LTN-TV-Setup-<version>.exe` and `LTN-TV-Portable-<version>.exe` to `src/dist/`.

Logos are in `assets/`. The app is built from the BackWhenTV player; setting `ltnOnly: false` in `src/renderer/ltn.js` brings back the original BackWhenTV lineup.

## Updates

LTN TV checks GitHub for a newer release a few seconds after it starts and every 6 hours. When there is one it asks; Enter / Y downloads the installer and runs it, Esc / N waits. Press U (or use the tray menu) to check now. The portable build opens the release page instead.

## Changing what a channel plays (the 2-hour rule)

A channel's programme is worked out from the clock and its video lists, so everyone sees the same thing. **A change to a channel's lineup must never alter what is on, or what is next, for the following 2 hours.** So a change to a show's extra playlists is given a time and the old lineup keeps running until then:

```js
{ id: "UC…", name: "CHURCH NERDS", lists: ["PL_new"], listsPrev: ["PL_old"], listsFrom: "2026-11-20T18:00:00Z" }
```

- `listsFrom` = at least 2 hours after the release goes out, rounded up to a 2-hour UTC boundary (18:00Z, 20:00Z, …). Everyone, whatever version or install time, switches at that same moment (an old version without the change simply never switches).
- `listsPrev` is what the channel had before (empty `[]` if it had none). Once `listsFrom` has passed it can be removed.
- A show with none of these keys keeps its built-in lineup, so the admin backend can't undo a scheduled change by omission.
- Not covered: a new YouTube upload shows up when the video list is next refreshed (every 6 hours), and a video that will not play is skipped on that PC.

## Twitch on any channel

A show channel can have up to 3 Twitch channels (in the admin: **Channels**, the "Twitch channels" box under the channel; or `twitch: ["login"]` on a show in `LTN.shows`). The app checks them with the other live checks (every 4 minutes, every 75 seconds for the channel being watched). While one is live, that channel shows the Twitch stream, the guide, banner and LTN News "live now" page say so, and when it ends the channel goes back to its videos. If the channel's own YouTube stream is live too, YouTube wins. A live stream works like a YouTube live stream does: it is not part of the 2-hour rule, since it only exists while the stream is on.
