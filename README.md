# LTN TV

Love Thy Nerd, always on. A TV-style player for Windows that carries only the Love Thy Nerd channels:

| Channel | What it is |
|---|---|
| 158 LTN LATEST | Who is live, plus the newest from Twitch, lovethynerd.com and YouTube, over background music |
| 159 LTN PLAYS GAMES | The Twitch stream when we are live; the LTN Plays Games YouTube channel on shuffle when we are not, with the next stream's time in the corner |
| 160 LTN DAILY BIBLE | The LTN Daily Audio Bible playlist, played through in order |
| 162-173 | One channel per show: Love Thy Nerd, NCMU Podcast, Nerd History, RPG Rundown, The Pull List, Save & Continue, Christian Board Gamers, Faith & Fandom, Satellite Stories, Two Words, Church Nerds, Bible Thump |

The show channels are always on and shuffled, and the same for everyone: what is playing, and how far in, depends only on the clock. They play full videos only (no Shorts) with captions off.

## Install

Download from the latest release:
- `LTN-TV-Setup-*.exe` installs it (choose the folder; it adds desktop and Start menu shortcuts you can pin to the taskbar).
- `LTN-TV-Portable-*.exe` runs without installing.

Windows may show "Windows protected your PC" because the app isn't code-signed yet: click **More info**, then **Run anyway**.

## Keys

Up/Down channel, 0-9 go to a channel, **Enter** or **G** guide, **H** favorite, **V** favorites only, **S** settings, **D** NDI output on/off, Left/Right volume, **M** mute, **F** fullscreen, Esc back, **Q** quit. Mouse wheel changes channel.

In the guide: arrows move, PgUp/PgDn jump five channels, **N** returns to now, Enter watches.

## NDI

Press **D** to send the whole app (picture and sound where the source allows) as one NDI source named `<your PC> (LTN TV)`. The picture is always the 1920x1080 fullscreen layout, whatever size the window is. Audio from YouTube's and Twitch's embedded players cannot be captured, so NDI carries their picture only.

NDI® is a registered trademark of Vizrt NDI AB.

## Building

The app source is in `src/`. Build from a short folder path (the NSIS installer fails on very long ones):

```
cd src
npm install
npm run dist
```

This writes `LTN-TV-Setup-<version>.exe` and `LTN-TV-Portable-<version>.exe` to `src/dist/`. NDI needs a C++ toolchain on first install because `@stagetimerio/grandiose` compiles a native addon; if node-gyp complains about `distutils`, install a newer node-gyp (`npm i --no-save node-gyp@latest`) and set `npm_config_node_gyp` to its `bin/node-gyp.js`.

Logos are in `assets/`. The app is built from the BackWhenTV player; setting `ltnOnly: false` in `src/renderer/ltn.js` brings back the original BackWhenTV lineup.
