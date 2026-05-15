# Running the Smart Plant simulation on Wokwi

You can test the entire firmware in your browser without buying any hardware.
Wokwi's virtual Wi-Fi reaches the real internet, so the simulated chip will
send actual Telegram messages to your phone.

This folder contains TWO simulation variants. Try ESP32 first.

---

## Option A (RECOMMENDED): ESP32 simulation

Wokwi's ESP32 support is rock-solid. The code is logically identical to the
ESP8266 sketch; only the headers, ADC range, and pin numbers differ.

### Files for this option

- `diagram_esp32.json` - ESP32 DevKit C v4 + soil sensor + relay module
- `sketch_esp32.ino`   - ESP32 firmware (sim timings)
- `libraries.txt`      - shared library list

### Steps

1. Open https://wokwi.com/projects/new/esp32 in your browser. A blank ESP32
   DevKit will appear with two tabs: `sketch.ino` and `diagram.json`.
2. Open `diagram_esp32.json` from this folder, copy ALL its contents, and
   paste into Wokwi's `diagram.json` tab (replace what's there).
3. Open `sketch_esp32.ino` from this folder, copy ALL its contents, and paste
   into Wokwi's `sketch.ino` tab.
4. At the top of the sketch, edit:
   - `BOT_TOKEN = "PASTE_BOT_TOKEN_HERE";`
   - `CHAT_ID   = "PASTE_CHAT_ID_HERE";`
   (SSID is already set to `Wokwi-GUEST`, the virtual Wi-Fi.)
5. Left sidebar -> Library Manager -> add `UniversalTelegramBot` and
   `ArduinoJson` (version 6.21.x).
6. Press the green Play button.

You should see in the Serial Monitor:
```
Wi-Fi.... OK, IP=10.13.x.y
Plant agent online (ESP32 SIM). Drag the soil slider to test.
raw=1240  pct=80%
```

### What to do once it's running

- **Drag the soil sensor slider toward "DRY"** until the raw value goes past 2800.
  Within ~5 seconds you'll see `DRY -> pumping` in Serial Monitor and the
  relay module LED will light up in the diagram - that's the moment the real
  pump would turn on.
- After 3 seconds the burst ends. After 8 more seconds (soak), the sketch
  re-reads the sensor.
- If you slid the slider back toward wet during the soak, you'll get the
  success message on your phone:
  *"I was thirsty so I watered myself. Moisture now NN%."*
- If you kept it dry, you'll get the SOS message:
  *"Tried to water but still dry. Check the tank!"*

---

## Option B (fallback): ESP8266 / Wemos D1 Mini simulation

Wokwi has ESP8266 support but it's been less polished since they pivoted
to ESP32-first. Try this only if Option A doesn't work for some reason.

### Files

- `diagram.json` - Wemos D1 Mini layout
- `sketch.ino`   - ESP8266 firmware (sim timings)
- `libraries.txt`

### Steps

1. Open https://wokwi.com/projects/new/wemos-d1-mini in your browser.
   *(The plain wokwi.com homepage only shows ESP32 - you need this direct URL.)*
2. Paste `diagram.json` and `sketch.ino` from this folder into Wokwi.
3. Same library add + bot token edit + Play as above.

---

## After simulation passes

The simulation only proves the LOGIC works (dry detection, pumping,
cooldown, Telegram). When you've seen the dry -> pump -> alert cycle work
end-to-end on Wokwi:

- Flash **`plant_communicator.ino`** (the production sketch in the
  `plant_communicator/` folder next to this one) onto your physical NodeMCU.
- The production sketch uses real-world timings: sample every 60 seconds,
  one-hour pump cooldown, six pumps max per day. Too slow to watch in a
  Wokwi session, but right for an actual plant.
