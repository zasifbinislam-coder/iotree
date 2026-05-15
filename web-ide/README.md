# IoTree Web IDE

A visual editor for building ESP32 / ESP8266 / Arduino / Pi Pico projects in
the browser. Pick a board, click to add sensors and modules, click pins to
wire them, and get a working Arduino sketch + Wokwi project file out the
other end.

## What it does

- **Pick from 4 boards** — ESP32 DevKit, NodeMCU ESP8266, Arduino Uno, Pi Pico.
- **Click any component** from the catalog (sensors / displays / inputs /
  outputs / motion) and it lands on the canvas.
- **Click a pin** on one part, then **click a pin on another part** to wire
  them. Compatible pins are highlighted; incompatible pairings are refused
  with a clear hint.
- **Drag parts around** to lay out your build the way you like.
- **Auto-power** button — one click and every component's VCC, GND, and I²C
  pins are connected to sensible board pins. You only have to manually wire
  the actual signal pins.
- **Live code panel** — generates an Arduino sketch that compiles for the
  selected chip, with `#include`s, pin defines, `setup()`, and a starter
  `loop()` calling each component's sample code.
- **Libraries panel** — shows the Arduino libraries you'll need to install
  (Adafruit BMP280, DHT sensor library, OneWire, etc.).
- **Wiring panel** — table of every wire, with one-click delete.
- **📤 Open in Wokwi** — copies the generated sketch + diagram to your
  clipboard and opens Wokwi with the matching board.
- **⬇ Download project** — downloads `diagram.json`, `sketch.ino`, and
  `libraries.txt` so you have a portable project folder.

## What it isn't

This is a visual editor, not a chip emulator. The simulated runtime lives
on Wokwi (and Wokwi spent years building it — that's not a one-session
project). Here, you compose your build visually, get clean generated code,
and ship it to Wokwi or a real flash one click away.

Library auto-install is impossible in a pure-browser tool because Arduino
libraries are compiled C/C++ packages handled by `arduino-cli`. The IDE
instead lists exactly what to install, and writes a `libraries.txt` you can
drop into Wokwi or PlatformIO.

## Pin compatibility rules

The wiring engine refuses physically wrong connections. The rules are:

| Component pin role | Can connect to board pin role |
|---|---|
| `power3v3` | `power3v3` |
| `power5v` | `power5v` or `power3v3` *(some parts tolerate either)* |
| `ground` | `ground` |
| `digital` | any `gpio` (also `i2c-sda`/`scl` if you really want to repurpose) |
| `analog` | any `gpio` with analog capability |
| `i2c-sda` | `i2c-sda` |
| `i2c-scl` | `i2c-scl` |

Mis-matches show a red hint at the top of the canvas.

## Adding more components

`catalog.js` is the source of truth. To add a new sensor:

```js
'my-sensor': {
  label: 'My Sensor',
  category: 'sensors',          // matches one of COMPONENT_CATEGORIES
  wokwiType: 'wokwi-my-sensor', // for Wokwi export
  width: 100, height: 80,
  pins: [
    { id: 'VCC', label: '+',  x: 20, y: 0, role: 'power3v3' },
    { id: 'GND', label: '-',  x: 50, y: 0, role: 'ground' },
    { id: 'OUT', label: 'OUT', x: 80, y: 0, role: 'digital' }
  ],
  libraries: ['MySensorLib'],
  code: {
    includes: ['MySensor.h'],
    decl:  (id, pin) => `MySensor ${id}(${pin});`,
    setup: (id)      => `${id}.begin();`,
    loop:  (id)      => `Serial.println(${id}.read());`
  }
}
```

The `code` callbacks receive the component's UID (so multiple of the same
type don't clash) and the board pin number that the component's data pin is
wired to.

## Layout

```
+---------+---------------------------+----------------+
| Catalog |  Canvas (SVG)             | sketch.ino     |
| (left)  |                           | libraries      |
|         |  [Board]      [Sensor]    | wiring         |
|         |     |__________|          |                |
|         |        wires              |                |
+---------+---------------------------+----------------+
                       status bar
```

3-column dark-themed editor; nothing is loaded from a CDN, so it works
fully offline as a static site.
