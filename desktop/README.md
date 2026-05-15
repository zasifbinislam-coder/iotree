# Plant Sim IDE - desktop wrapper

Wraps the static `plant-sim-ide/` folder as a native desktop window using
[Electron](https://www.electronjs.org/). Same UI, same simulator, no browser
chrome, real desktop window.

## Run it during development

From this folder:

```sh
npm install
npm start
```

The first `install` fetches Electron (~250 MB) and may take a few minutes.
After that, `npm start` opens the IDE window in about 2 seconds.

While running:
- `F12` — toggle DevTools
- `Ctrl + R` — reload after editing source
- `Ctrl + Q` — quit
- All Monaco editor shortcuts (`Ctrl+/` comment, `F1` palette, etc.) work normally

## Build a distributable

### Windows installer (.exe)

```sh
npm run dist:win
```

Produces:
- `dist/Plant Sim IDE Setup 1.0.0.exe` — NSIS installer
- `dist/Plant Sim IDE 1.0.0.exe` — portable (no install needed, just run)

Build time: ~2-5 minutes. Output size: ~80-120 MB.

### Cross-platform

```sh
npm run dist
```

Builds for whichever platform you're on. Set up GitHub Actions if you want
Windows + Linux + macOS builds from one push.

## Folder layout

```
desktop/
├── main.js        ← Electron main process (creates the window)
├── package.json   ← Electron + electron-builder config
├── build/         ← place icon.png (256x256) / icon.icns here before dist
└── README.md
```

The IDE itself lives in `../plant-sim-ide/`. During development, Electron
loads it via a relative path. During `dist`, electron-builder copies the
folder into the package automatically (see the `build.files` config).

## Adding an icon

For the distributable to ship with a proper icon:

1. Create a 256×256 PNG of the plant icon (convert `../plant-sim-ide/icon.svg`
   using any image editor or:
   ```sh
   npx svg2png-cli ../plant-sim-ide/icon.svg -w 256 -h 256 -o build/icon.png
   ```
2. For macOS, also generate `build/icon.icns` (use [iconutil](https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html) or [png2icns](https://www.npmjs.com/package/png2icns)).
3. Run `npm run dist:win`.

If `build/icon.png` is missing, electron-builder falls back to the default
Electron icon (which still works, just less branded).

## Why a desktop wrap at all?

The web version at https://zasifbinislam-coder.github.io/iotree/plant-sim-ide/
is fully featured. A desktop wrap adds:

- **Offline first** — works without any internet from the very first launch
  (no service-worker warm-up needed)
- **Standalone window** — no tab clutter, dedicated taskbar/Dock entry
- **Auto-update path** — wire `electron-updater` later to push updates
- **File associations** — could register `.ino` files to open in the IDE
