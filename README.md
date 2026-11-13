# BackWhenTV

Free 90s-style cable TV. Android TV, Google TV, Fire TV, Windows (and Roku soon).

Website: https://backwhen.stream

## Windows

Download from the latest release:
- `BackWhenTV-Setup-*.exe` installs it (per user, no admin needed).
- `BackWhenTV-Portable-*.exe` runs without installing.

Windows may show "Windows protected your PC" because the app isn't code-signed yet: click **More info**, then **Run anyway**.

Keys: Up/Down channel, 0-9 go to, Enter guide, Left/Right volume, M mute, F fullscreen, Esc back, Q quit. Mouse wheel changes channel.

### Guide and NDI (1.3.0)

Press **Enter** or **G** for the time-grid guide: Left/Right move between programs, Up/Down change channel, PgUp/PgDn jump five channels, **N** jumps back to now, Enter watches. The corner box shows a live preview of the highlighted channel.

Press **D** to turn on NDI output. The whole app window and its audio are sent as one NDI source named `<your PC> (BackWhenTV)`, which OBS (with NDI support), vMix and other NDI receivers can pick up. Press **D** again to stop. It is off until you turn it on.

NDI® is a registered trademark of Vizrt NDI AB.

## Building

The app source is in `src/`. From a short folder path (the NSIS installer fails on very long ones):

```
cd src
npm install
npm run dist
```

This writes `BackWhenTV-Setup-<version>.exe` and `BackWhenTV-Portable-<version>.exe` to `src/dist/`. NDI needs a C++ toolchain on first install because `@stagetimerio/grandiose` compiles a native addon; if node-gyp complains about `distutils`, install a newer node-gyp (`npm i --no-save node-gyp@latest`) and set `npm_config_node_gyp` to its `bin/node-gyp.js`.
