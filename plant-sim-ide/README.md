# Plant Sim IDE

A self-contained browser-based IDE for the Smart Plant Communicator. Edit
`sketch.ino` and `diagram.json`, press Run, watch the plant get watered.

## How to use

1. **Double-click `index.html`.** It opens in your default browser. No install,
   no internet, no server needed.
2. The IDE loads with the example sketch and diagram already in place.
3. Press **▶ Run** (or `Ctrl+Enter`).
4. The simulation parses your sketch's `const` declarations and starts
   running:
   - The plant naturally dries out over time (~1% per second).
   - When soil moisture crosses the dry threshold and the tank has water,
     the pump kicks on: motor spins, water flows through the tube, droplets
     fall from the nozzle, the soil darkens, and a Telegram message appears
     in the panel.
   - If the tank is empty when the soil goes dry, no pumping happens — you
     just get an SOS message instead.
5. **Try editing the constants** in the sketch and pressing Run again:
   - Change `PUMP_BURST_MS = 5UL * 1000UL` to `1UL * 1000UL` and watch the
     burst become a quick spray.
   - Change `DRY_THRESHOLD = 800` to `500` and the plant will trigger
     watering much sooner.
   - Change `MAX_PUMPS_PER_DAY = 6` to `1` and the system will refuse to
     water a second time, sending an SOS instead.

## Sharing

This whole folder is portable. Zip `plant-sim-ide/` and send it to anyone —
they extract, open `index.html`, and have a working simulator. They can paste
their own sketches into the editor and test.

## What gets parsed from the sketch

The IDE looks for `const` declarations of these names:

| Name | Effect on simulation |
|---|---|
| `DRY_THRESHOLD` | Raw ADC value at/above which soil triggers watering |
| `WET_FLOOR` | Raw ADC value at/below which soil is "fully wet" (100%) |
| `PUMP_BURST_MS` | How long the pump runs per burst |
| `SOAK_WAIT_MS` | Wait time after a burst before re-checking moisture |
| `PUMP_COOLDOWN_MS` | Minimum gap between pump bursts |
| `SAMPLE_INTERVAL_MS` | How often the sensor is read |
| `MAX_PUMPS_PER_DAY` | Daily watering cap |
| `PUMP_ACTIVE_LOW` | Relay polarity (cosmetic) |

If a constant can't be parsed, the IDE falls back to a sensible default and
warns you in the status bar.

The IDE auto-detects whether the thresholds look like ESP8266 (0–1023) or
ESP32 (0–4095) values, and scales accordingly.

## What this is not

Not a real Arduino emulator. The C++ code is not actually compiled or
executed. The IDE extracts your tuning constants and feeds them to a
JavaScript port of the same state machine. That's accurate enough to test
the *behaviour* of your settings — burst lengths, thresholds, cooldowns,
quotas — without burning out a real pump.

For true firmware emulation, use [Wokwi](https://wokwi.com) — but it can't
animate a watering scene like this can.

## Folder layout

```
plant-sim-ide/
├── index.html         ← double-click this
├── style.css
├── app.js             ← state machine + parser + UI
├── default-files.js   ← embedded sketch + diagram (for offline use)
├── sketch.ino         ← reference copy of the bundled sketch
├── diagram.json       ← reference copy of the bundled diagram
└── README.md          ← this file
```

## Keyboard shortcuts

- `Ctrl + Enter` — Run
- `Ctrl + S` — Save sketch as a downloadable .ino
- `Tab` in the editor — inserts 2 spaces

## Tested in

Chrome 120+, Firefox 119+, Edge 120+, Safari 17+. Works fully offline once
opened.
