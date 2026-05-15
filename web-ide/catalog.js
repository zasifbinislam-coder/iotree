// =========================================================================
// Board + component catalog for the Web IDE.
// Adding a new board: append to BOARDS.
// Adding a new component: append to COMPONENTS.
// =========================================================================

window.BOARDS = {

  'esp32-devkit': {
    label: 'ESP32 DevKit C v4',
    chip: 'esp32',
    description: 'Espressif ESP32 with WiFi + Bluetooth. 12-bit ADC.',
    wokwiType: 'board-esp32-devkit-c-v4',
    width: 130, height: 320,
    headers: ['#include <WiFi.h>'],
    pins: [
      { id: '3V3',  label: '3V3',  side: 'left',  y: 30,  role: 'power3v3' },
      { id: 'GND',  label: 'GND',  side: 'left',  y: 56,  role: 'ground' },
      { id: 'VIN',  label: '5V',   side: 'left',  y: 82,  role: 'power5v' },
      { id: '4',    label: 'D4',   side: 'right', y: 30,  role: 'gpio' },
      { id: '5',    label: 'D5',   side: 'right', y: 56,  role: 'gpio' },
      { id: '13',   label: 'D13',  side: 'right', y: 82,  role: 'gpio' },
      { id: '14',   label: 'D14',  side: 'right', y: 108, role: 'gpio' },
      { id: '21',   label: 'D21 (SDA)', side: 'right', y: 134, role: 'i2c-sda' },
      { id: '22',   label: 'D22 (SCL)', side: 'right', y: 160, role: 'i2c-scl' },
      { id: '25',   label: 'D25',  side: 'right', y: 186, role: 'gpio' },
      { id: '26',   label: 'D26',  side: 'right', y: 212, role: 'gpio' },
      { id: '27',   label: 'D27',  side: 'right', y: 238, role: 'gpio' },
      { id: '32',   label: 'D32',  side: 'right', y: 264, role: 'gpio', analog: true },
      { id: '33',   label: 'D33',  side: 'right', y: 290, role: 'gpio', analog: true },
      { id: '34',   label: 'D34',  side: 'left',  y: 134, role: 'gpio', analog: true, inputOnly: true },
      { id: '35',   label: 'D35',  side: 'left',  y: 160, role: 'gpio', analog: true, inputOnly: true },
      { id: 'GND2', label: 'GND',  side: 'left',  y: 186, role: 'ground' }
    ]
  },

  'nodemcu-esp8266': {
    label: 'NodeMCU ESP8266',
    chip: 'esp8266',
    description: 'Espressif ESP8266 with WiFi. One analog pin (A0).',
    wokwiType: 'board-wemos-d1-mini',
    width: 130, height: 280,
    headers: ['#include <ESP8266WiFi.h>'],
    pins: [
      { id: '3V3',  label: '3V3', side: 'left',  y: 30,  role: 'power3v3' },
      { id: 'GND',  label: 'GND', side: 'left',  y: 56,  role: 'ground' },
      { id: 'VIN',  label: 'VIN', side: 'left',  y: 82,  role: 'power5v' },
      { id: 'A0',   label: 'A0',  side: 'left',  y: 108, role: 'gpio', analog: true, inputOnly: true },
      { id: 'GND2', label: 'GND', side: 'left',  y: 134, role: 'ground' },
      { id: 'D1',   label: 'D1',  side: 'right', y: 30,  role: 'gpio' },
      { id: 'D2',   label: 'D2',  side: 'right', y: 56,  role: 'gpio' },
      { id: 'D3',   label: 'D3',  side: 'right', y: 82,  role: 'gpio' },
      { id: 'D4',   label: 'D4',  side: 'right', y: 108, role: 'gpio' },
      { id: 'D5',   label: 'D5 (SCL)', side: 'right', y: 134, role: 'i2c-scl' },
      { id: 'D6',   label: 'D6',  side: 'right', y: 160, role: 'gpio' },
      { id: 'D7',   label: 'D7',  side: 'right', y: 186, role: 'gpio' },
      { id: 'D8',   label: 'D8',  side: 'right', y: 212, role: 'gpio' },
      { id: 'GND3', label: 'GND', side: 'right', y: 238, role: 'ground' }
    ]
  },

  'arduino-uno': {
    label: 'Arduino Uno R3',
    chip: 'atmega328p',
    description: 'Classic Arduino. 8-bit AVR @ 16 MHz. 10-bit ADC.',
    wokwiType: 'wokwi-arduino-uno',
    width: 150, height: 280,
    headers: [],
    pins: [
      { id: '5V',   label: '5V',  side: 'left',  y: 30,  role: 'power5v' },
      { id: '3V3',  label: '3.3V',side: 'left',  y: 56,  role: 'power3v3' },
      { id: 'GND',  label: 'GND', side: 'left',  y: 82,  role: 'ground' },
      { id: 'A0',   label: 'A0',  side: 'left',  y: 108, role: 'gpio', analog: true },
      { id: 'A1',   label: 'A1',  side: 'left',  y: 134, role: 'gpio', analog: true },
      { id: 'A2',   label: 'A2',  side: 'left',  y: 160, role: 'gpio', analog: true },
      { id: 'A3',   label: 'A3',  side: 'left',  y: 186, role: 'gpio', analog: true },
      { id: 'A4',   label: 'A4 (SDA)', side: 'left', y: 212, role: 'i2c-sda', analog: true },
      { id: 'A5',   label: 'A5 (SCL)', side: 'left', y: 238, role: 'i2c-scl', analog: true },
      { id: '2',    label: 'D2',  side: 'right', y: 30,  role: 'gpio' },
      { id: '3',    label: 'D3 (PWM)', side: 'right', y: 56,  role: 'gpio', pwm: true },
      { id: '4',    label: 'D4',  side: 'right', y: 82,  role: 'gpio' },
      { id: '5',    label: 'D5 (PWM)', side: 'right', y: 108, role: 'gpio', pwm: true },
      { id: '6',    label: 'D6 (PWM)', side: 'right', y: 134, role: 'gpio', pwm: true },
      { id: '7',    label: 'D7',  side: 'right', y: 160, role: 'gpio' },
      { id: '8',    label: 'D8',  side: 'right', y: 186, role: 'gpio' },
      { id: '9',    label: 'D9 (PWM)', side: 'right', y: 212, role: 'gpio', pwm: true },
      { id: '10',   label: 'D10 (PWM)', side: 'right', y: 238, role: 'gpio', pwm: true }
    ]
  },

  'rpi-pico': {
    label: 'Raspberry Pi Pico',
    chip: 'rp2040',
    description: 'RP2040 dual-core ARM. 12-bit ADC. Arduino-Pico framework.',
    wokwiType: 'wokwi-pi-pico',
    width: 130, height: 280,
    headers: [],
    pins: [
      { id: '3V3',  label: '3V3', side: 'left',  y: 30,  role: 'power3v3' },
      { id: 'GND',  label: 'GND', side: 'left',  y: 56,  role: 'ground' },
      { id: 'VBUS', label: '5V',  side: 'left',  y: 82,  role: 'power5v' },
      { id: 'GP26', label: 'GP26',side: 'left',  y: 108, role: 'gpio', analog: true },
      { id: 'GP27', label: 'GP27',side: 'left',  y: 134, role: 'gpio', analog: true },
      { id: 'GP28', label: 'GP28',side: 'left',  y: 160, role: 'gpio', analog: true },
      { id: 'GP0',  label: 'GP0', side: 'right', y: 30,  role: 'gpio' },
      { id: 'GP1',  label: 'GP1', side: 'right', y: 56,  role: 'gpio' },
      { id: 'GP2',  label: 'GP2', side: 'right', y: 82,  role: 'gpio' },
      { id: 'GP4',  label: 'GP4 (SDA)', side: 'right', y: 108, role: 'i2c-sda' },
      { id: 'GP5',  label: 'GP5 (SCL)', side: 'right', y: 134, role: 'i2c-scl' },
      { id: 'GP10', label: 'GP10',side: 'right', y: 160, role: 'gpio' },
      { id: 'GP11', label: 'GP11',side: 'right', y: 186, role: 'gpio' },
      { id: 'GP15', label: 'GP15',side: 'right', y: 212, role: 'gpio' }
    ]
  }
};

// =========================================================================

window.COMPONENT_CATEGORIES = ['sensors', 'displays', 'inputs', 'outputs', 'motion'];

window.COMPONENTS = {

  // ============== SENSORS ==============
  'dht22': {
    label: 'DHT22 (Temp + Humidity)',
    category: 'sensors',
    wokwiType: 'wokwi-dht22',
    width: 100, height: 80,
    pins: [
      { id: 'VCC', label: '+',   x: 20,  y: 0, role: 'power3v3' },
      { id: 'SDA', label: 'OUT', x: 50,  y: 0, role: 'digital' },
      { id: 'GND', label: '-',   x: 80,  y: 0, role: 'ground' }
    ],
    libraries: ['DHT sensor library'],
    code: {
      includes: ['DHT.h'],
      decl:  (id, pin) => `DHT ${id}(${pin}, DHT22);`,
      setup: (id)      => `${id}.begin();`,
      loop:  (id)      => `float t_${id} = ${id}.readTemperature();\n  float h_${id} = ${id}.readHumidity();\n  Serial.printf("[${id}] T=%.1fC H=%.1f%%\\n", t_${id}, h_${id});`
    }
  },

  'dht11': {
    label: 'DHT11 (Cheap Temp + Humidity)',
    category: 'sensors',
    wokwiType: 'wokwi-dht22',
    width: 100, height: 80,
    pins: [
      { id: 'VCC', label: '+',   x: 20, y: 0, role: 'power3v3' },
      { id: 'SDA', label: 'OUT', x: 50, y: 0, role: 'digital' },
      { id: 'GND', label: '-',   x: 80, y: 0, role: 'ground' }
    ],
    libraries: ['DHT sensor library'],
    code: {
      includes: ['DHT.h'],
      decl:  (id, pin) => `DHT ${id}(${pin}, DHT11);`,
      setup: (id)      => `${id}.begin();`,
      loop:  (id)      => `Serial.printf("[${id}] T=%.0fC H=%.0f%%\\n", ${id}.readTemperature(), ${id}.readHumidity());`
    }
  },

  'ds18b20': {
    label: 'DS18B20 (Waterproof Temp)',
    category: 'sensors',
    wokwiType: 'wokwi-ds18b20',
    width: 100, height: 80,
    pins: [
      { id: 'VCC',  label: '+',    x: 20, y: 0, role: 'power3v3' },
      { id: 'DATA', label: 'DATA', x: 50, y: 0, role: 'digital' },
      { id: 'GND',  label: '-',    x: 80, y: 0, role: 'ground' }
    ],
    libraries: ['OneWire', 'DallasTemperature'],
    code: {
      includes: ['OneWire.h', 'DallasTemperature.h'],
      decl:  (id, pin) => `OneWire ow_${id}(${pin});\nDallasTemperature ${id}(&ow_${id});`,
      setup: (id)      => `${id}.begin();`,
      loop:  (id)      => `${id}.requestTemperatures();\n  Serial.printf("[${id}] T=%.2fC\\n", ${id}.getTempCByIndex(0));`
    }
  },

  'bmp280': {
    label: 'BMP280 (Pressure + Temp, I2C)',
    category: 'sensors',
    wokwiType: 'wokwi-bmp280',
    width: 100, height: 80,
    pins: [
      { id: 'VCC', label: '+',   x: 15, y: 0, role: 'power3v3' },
      { id: 'GND', label: '-',   x: 38, y: 0, role: 'ground' },
      { id: 'SCL', label: 'SCL', x: 62, y: 0, role: 'i2c-scl' },
      { id: 'SDA', label: 'SDA', x: 85, y: 0, role: 'i2c-sda' }
    ],
    libraries: ['Adafruit BMP280 Library'],
    code: {
      includes: ['Wire.h', 'Adafruit_BMP280.h'],
      decl:  (id)   => `Adafruit_BMP280 ${id};`,
      setup: (id)   => `${id}.begin(0x76);`,
      loop:  (id)   => `Serial.printf("[${id}] T=%.1fC P=%.0f Pa\\n", ${id}.readTemperature(), ${id}.readPressure());`
    }
  },

  'mpu6050': {
    label: 'MPU6050 (Gyro + Accel, I2C)',
    category: 'sensors',
    wokwiType: 'wokwi-mpu6050',
    width: 100, height: 80,
    pins: [
      { id: 'VCC', label: '+',   x: 15, y: 0, role: 'power3v3' },
      { id: 'GND', label: '-',   x: 38, y: 0, role: 'ground' },
      { id: 'SCL', label: 'SCL', x: 62, y: 0, role: 'i2c-scl' },
      { id: 'SDA', label: 'SDA', x: 85, y: 0, role: 'i2c-sda' }
    ],
    libraries: ['Adafruit MPU6050', 'Adafruit Unified Sensor'],
    code: {
      includes: ['Wire.h', 'Adafruit_MPU6050.h', 'Adafruit_Sensor.h'],
      decl:  (id)   => `Adafruit_MPU6050 ${id};`,
      setup: (id)   => `${id}.begin();`,
      loop:  (id)   => `sensors_event_t a, g, t;\n  ${id}.getEvent(&a, &g, &t);\n  Serial.printf("[${id}] aX=%.2f aY=%.2f aZ=%.2f\\n", a.acceleration.x, a.acceleration.y, a.acceleration.z);`
    }
  },

  'hcsr04': {
    label: 'HC-SR04 (Ultrasonic Distance)',
    category: 'sensors',
    wokwiType: 'wokwi-hc-sr04',
    width: 120, height: 80,
    pins: [
      { id: 'VCC',  label: 'VCC',  x: 15, y: 0, role: 'power5v' },
      { id: 'TRIG', label: 'TRIG', x: 45, y: 0, role: 'digital' },
      { id: 'ECHO', label: 'ECHO', x: 75, y: 0, role: 'digital' },
      { id: 'GND',  label: 'GND',  x: 105,y: 0, role: 'ground' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id)             => `const uint8_t ${id}_trig = TRIG_PIN_${id};\nconst uint8_t ${id}_echo = ECHO_PIN_${id};`,
      setup: (id)             => `pinMode(${id}_trig, OUTPUT);\n  pinMode(${id}_echo, INPUT);`,
      loop:  (id)             => `digitalWrite(${id}_trig, LOW); delayMicroseconds(2);\n  digitalWrite(${id}_trig, HIGH); delayMicroseconds(10);\n  digitalWrite(${id}_trig, LOW);\n  long us = pulseIn(${id}_echo, HIGH);\n  Serial.printf("[${id}] %.1f cm\\n", us / 58.0);`
    }
  },

  'ldr': {
    label: 'LDR (Light Sensor, analog)',
    category: 'sensors',
    wokwiType: 'wokwi-ldr',
    width: 80, height: 70,
    pins: [
      { id: 'A', label: '+', x: 20, y: 0, role: 'power3v3' },
      { id: 'B', label: 'OUT', x: 60, y: 0, role: 'analog' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: ()        => '',
      loop:  (id)      => `int ${id}_v = analogRead(${id}_pin);\n  Serial.printf("[${id}] light=%d\\n", ${id}_v);`
    }
  },

  'soilmoisture': {
    label: 'Soil Moisture (analog)',
    category: 'sensors',
    wokwiType: 'wokwi-soil-moisture-sensor',
    width: 100, height: 70,
    pins: [
      { id: 'VCC', label: '+',   x: 20, y: 0, role: 'power3v3' },
      { id: 'GND', label: '-',   x: 50, y: 0, role: 'ground' },
      { id: 'SIG', label: 'AOUT',x: 80, y: 0, role: 'analog' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: ()        => '',
      loop:  (id)      => `int ${id}_raw = analogRead(${id}_pin);\n  Serial.printf("[${id}] soil=%d\\n", ${id}_raw);`
    }
  },

  'potentiometer': {
    label: 'Potentiometer (10kΩ, analog)',
    category: 'sensors',
    wokwiType: 'wokwi-potentiometer',
    width: 80, height: 70,
    pins: [
      { id: 'VCC', label: '+',   x: 15, y: 0, role: 'power3v3' },
      { id: 'SIG', label: 'SIG', x: 40, y: 0, role: 'analog' },
      { id: 'GND', label: '-',   x: 65, y: 0, role: 'ground' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: ()        => '',
      loop:  (id)      => `int ${id}_v = analogRead(${id}_pin);`
    }
  },

  // ============== DISPLAYS ==============
  'oled-ssd1306': {
    label: '0.96" OLED (SSD1306, I2C)',
    category: 'displays',
    wokwiType: 'wokwi-ssd1306',
    width: 120, height: 80,
    pins: [
      { id: 'VCC', label: '+',   x: 20, y: 0, role: 'power3v3' },
      { id: 'GND', label: '-',   x: 45, y: 0, role: 'ground' },
      { id: 'SCL', label: 'SCL', x: 75, y: 0, role: 'i2c-scl' },
      { id: 'SDA', label: 'SDA', x: 105,y: 0, role: 'i2c-sda' }
    ],
    libraries: ['Adafruit SSD1306', 'Adafruit GFX Library'],
    code: {
      includes: ['Wire.h', 'Adafruit_GFX.h', 'Adafruit_SSD1306.h'],
      decl:  (id) => `Adafruit_SSD1306 ${id}(128, 64, &Wire, -1);`,
      setup: (id) => `${id}.begin(SSD1306_SWITCHCAPVCC, 0x3C);\n  ${id}.clearDisplay();\n  ${id}.setTextSize(1);\n  ${id}.setTextColor(SSD1306_WHITE);`,
      loop:  (id) => `${id}.clearDisplay();\n  ${id}.setCursor(0,0);\n  ${id}.println("Hello!");\n  ${id}.display();`
    }
  },

  'lcd1602-i2c': {
    label: '16x2 LCD with I2C backpack',
    category: 'displays',
    wokwiType: 'wokwi-lcd1602',
    width: 130, height: 70,
    pins: [
      { id: 'VCC', label: '+',   x: 20, y: 0, role: 'power5v' },
      { id: 'GND', label: '-',   x: 50, y: 0, role: 'ground' },
      { id: 'SDA', label: 'SDA', x: 80, y: 0, role: 'i2c-sda' },
      { id: 'SCL', label: 'SCL', x: 110,y: 0, role: 'i2c-scl' }
    ],
    libraries: ['LiquidCrystal_I2C'],
    code: {
      includes: ['Wire.h', 'LiquidCrystal_I2C.h'],
      decl:  (id) => `LiquidCrystal_I2C ${id}(0x27, 16, 2);`,
      setup: (id) => `${id}.init();\n  ${id}.backlight();\n  ${id}.print("Hello, Sir!");`,
      loop:  ()   => ''
    }
  },

  // ============== INPUTS ==============
  'pushbutton': {
    label: 'Push Button',
    category: 'inputs',
    wokwiType: 'wokwi-pushbutton',
    width: 70, height: 70,
    pins: [
      { id: '1', label: 'A', x: 20, y: 0, role: 'digital' },
      { id: '2', label: 'B', x: 50, y: 0, role: 'ground' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: (id)      => `pinMode(${id}_pin, INPUT_PULLUP);`,
      loop:  (id)      => `if (digitalRead(${id}_pin) == LOW) { Serial.println("[${id}] pressed"); }`
    }
  },

  'slide-switch': {
    label: 'Slide Switch',
    category: 'inputs',
    wokwiType: 'wokwi-slide-switch',
    width: 90, height: 60,
    pins: [
      { id: '1', label: '1', x: 20, y: 0, role: 'ground' },
      { id: '2', label: '2', x: 45, y: 0, role: 'digital' },
      { id: '3', label: '3', x: 70, y: 0, role: 'power3v3' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: (id)      => `pinMode(${id}_pin, INPUT_PULLUP);`,
      loop:  (id)      => `bool ${id}_on = (digitalRead(${id}_pin) == LOW);`
    }
  },

  'pir': {
    label: 'PIR Motion Sensor',
    category: 'inputs',
    wokwiType: 'wokwi-pir-motion-sensor',
    width: 100, height: 80,
    pins: [
      { id: 'VCC', label: '+',   x: 20, y: 0, role: 'power5v' },
      { id: 'OUT', label: 'OUT', x: 50, y: 0, role: 'digital' },
      { id: 'GND', label: '-',   x: 80, y: 0, role: 'ground' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: (id)      => `pinMode(${id}_pin, INPUT);`,
      loop:  (id)      => `if (digitalRead(${id}_pin) == HIGH) { Serial.println("[${id}] motion!"); }`
    }
  },

  // ============== OUTPUTS ==============
  'led': {
    label: 'LED',
    category: 'outputs',
    wokwiType: 'wokwi-led',
    width: 60, height: 70,
    pins: [
      { id: 'A', label: 'A', x: 15, y: 0, role: 'digital' },
      { id: 'C', label: 'C', x: 45, y: 0, role: 'ground' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: (id)      => `pinMode(${id}_pin, OUTPUT);`,
      loop:  (id)      => `digitalWrite(${id}_pin, !digitalRead(${id}_pin)); delay(500);`
    }
  },

  'rgb-led': {
    label: 'RGB LED (common cathode)',
    category: 'outputs',
    wokwiType: 'wokwi-rgb-led',
    width: 80, height: 80,
    pins: [
      { id: 'R',   label: 'R', x: 12, y: 0, role: 'digital' },
      { id: 'COM', label: '-', x: 32, y: 0, role: 'ground' },
      { id: 'G',   label: 'G', x: 52, y: 0, role: 'digital' },
      { id: 'B',   label: 'B', x: 72, y: 0, role: 'digital' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id)   => `// ${id} uses 3 pins - wire each to a PWM-capable GPIO`,
      setup: (id)   => `// Set the 3 RGB pins to OUTPUT mode in setup()`,
      loop:  ()     => ''
    }
  },

  'buzzer': {
    label: 'Passive Buzzer',
    category: 'outputs',
    wokwiType: 'wokwi-buzzer',
    width: 70, height: 70,
    pins: [
      { id: '1', label: '+', x: 20, y: 0, role: 'digital' },
      { id: '2', label: '-', x: 50, y: 0, role: 'ground' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: (id)      => `pinMode(${id}_pin, OUTPUT);`,
      loop:  (id)      => `tone(${id}_pin, 1000, 200);`
    }
  },

  'relay': {
    label: 'Relay Module',
    category: 'outputs',
    wokwiType: 'wokwi-relay-module',
    width: 110, height: 80,
    pins: [
      { id: 'VCC', label: 'VCC', x: 20, y: 0, role: 'power5v' },
      { id: 'GND', label: 'GND', x: 55, y: 0, role: 'ground' },
      { id: 'IN',  label: 'IN',  x: 90, y: 0, role: 'digital' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};\nconst bool ${id}_ACTIVE_LOW = true;`,
      setup: (id)      => `digitalWrite(${id}_pin, ${id}_ACTIVE_LOW ? HIGH : LOW);\n  pinMode(${id}_pin, OUTPUT);`,
      loop:  ()        => ''
    }
  },

  // ============== MOTION ==============
  'servo': {
    label: 'Servo Motor',
    category: 'motion',
    wokwiType: 'wokwi-servo',
    width: 90, height: 80,
    pins: [
      { id: 'VCC',  label: '+',  x: 15, y: 0, role: 'power5v' },
      { id: 'GND',  label: '-',  x: 40, y: 0, role: 'ground' },
      { id: 'PWM',  label: 'IN', x: 65, y: 0, role: 'digital' }
    ],
    libraries: ['Servo'],
    code: {
      includes: ['Servo.h'],
      decl:  (id)      => `Servo ${id};`,
      setup: (id, pin) => `${id}.attach(${pin});`,
      loop:  (id)      => `${id}.write(90); // sweep 0-180 to test`
    }
  },

  'dc-motor': {
    label: 'DC Motor (via driver/relay)',
    category: 'motion',
    wokwiType: 'wokwi-dc-motor',
    width: 100, height: 80,
    pins: [
      { id: '1', label: '+', x: 25, y: 0, role: 'digital' },
      { id: '2', label: '-', x: 75, y: 0, role: 'ground' }
    ],
    libraries: [],
    code: {
      includes: [],
      decl:  (id, pin) => `const uint8_t ${id}_pin = ${pin};`,
      setup: (id)      => `pinMode(${id}_pin, OUTPUT);`,
      loop:  (id)      => `analogWrite(${id}_pin, 128); // 0-255 speed`
    }
  }
};

// =========================================================================
// RUNTIME (simulator) configs — attached to components below.
// Components without a runtime entry are visible & wireable & generate code,
// but they don't get a live widget in the simulator panel.
// =========================================================================
const RUNTIMES = {

  'potentiometer': {
    widget: 'slider',
    state: () => ({ value: 512, max: 1023 }),
    onPinRead: (state, pinId) => pinId === 'SIG' ? state.value : null
  },

  'soilmoisture': {
    widget: 'slider',
    state: () => ({ value: 500, max: 1023, label: 'soil (0=wet, 1023=dry)' }),
    onPinRead: (state, pinId) => pinId === 'SIG' ? state.value : null
  },

  'ldr': {
    widget: 'slider',
    state: () => ({ value: 400, max: 1023, label: 'light (low=dark)' }),
    onPinRead: (state, pinId) => pinId === 'B' ? state.value : null
  },

  'pushbutton': {
    widget: 'momentary',
    state: () => ({ pressed: false }),
    // INPUT_PULLUP convention: pressed = LOW, released = HIGH
    onPinRead: (state, pinId) => state.pressed ? 0 : 1
  },

  'slide-switch': {
    widget: 'toggle',
    state: () => ({ on: false }),
    onPinRead: (state, pinId) => state.on ? 0 : 1
  },

  'pir': {
    widget: 'momentary',
    state: () => ({ pressed: false, label: 'motion' }),
    onPinRead: (state, pinId) => state.pressed ? 1 : 0
  },

  'led': {
    widget: 'led',
    state: () => ({ lit: false, brightness: 0 }),
    onPinWrite: (state, pinId, val) => {
      state.lit = val > 0;
      state.brightness = val > 1 ? Math.min(255, val) : (val ? 255 : 0);
    }
  },

  'rgb-led': {
    widget: 'led',
    state: () => ({ lit: false }),
    onPinWrite: (state, pinId, val) => { state.lit = val > 0; }
  },

  'relay': {
    widget: 'relay',
    state: () => ({ on: false, activeLow: true }),
    onPinWrite: (state, pinId, val) => {
      // Most cheap relay modules are active-LOW: LOW = engaged, HIGH = off
      state.on = state.activeLow ? (val === 0) : (val > 0);
    }
  },

  'buzzer': {
    widget: 'buzzer',
    state: () => ({ active: false }),
    onPinWrite: (state, pinId, val) => { state.active = val > 0; }
  },

  'servo': {
    widget: 'servo',
    state: () => ({ angle: 0 }),
    onPinWrite: (state, pinId, val) => { state.angle = val; }
  },

  'dc-motor': {
    widget: 'led',
    state: () => ({ lit: false }),
    onPinWrite: (state, pinId, val) => { state.lit = val > 0; }
  }
};

Object.entries(RUNTIMES).forEach(([type, rt]) => {
  if (window.COMPONENTS[type]) window.COMPONENTS[type].runtime = rt;
});

// Pin role compatibility table - which board pin roles can a component pin connect to?
window.PIN_COMPAT = {
  'power3v3': ['power3v3'],
  'power5v':  ['power5v', 'power3v3'],   // 5V-rated parts often run on 3V3 too
  'ground':   ['ground'],
  'digital':  ['gpio', 'i2c-sda', 'i2c-scl'],
  'analog':   ['gpio', 'i2c-sda', 'i2c-scl'],  // any GPIO with analog cap
  'i2c-sda':  ['i2c-sda'],
  'i2c-scl':  ['i2c-scl']
};
