#include "Adafruit_FreeTouch.h"
#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>

#define PIN_LED_R 16
#define PIN_LED_G 22
#define PIN_LED_B 17

#define N_PAD 6

#define PAD_THRESH 600

const int pins_piano[N_PAD] = {2, 3, 4, 5, 6, 7};

Adafruit_FreeTouch qt_array[N_PAD];

// type of board (firmware name)
OSAP osap("capacitive");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
EP_ONDATA_RESPONSES setRGB(uint8_t* data, uint16_t len);

Endpoint rgbEndpoint(&osap, "setRGB", setRGB);

EP_ONDATA_RESPONSES setRGB(uint8_t* data, uint16_t len) {
  analogWrite(PIN_LED_R, data[0]);
  analogWrite(PIN_LED_G, data[1]);
  analogWrite(PIN_LED_B, data[2]);

  if (data[0] == 255 && data[1] == 255 && data[2] == 255) {
    digitalWrite(PIN_LED_R, 1);
    digitalWrite(PIN_LED_G, 1);
    digitalWrite(PIN_LED_B, 1);
  }

  return EP_ONDATA_ACCEPT;
}

// ---------------------------------------------- 2 Vertex
Endpoint capacitiveEndpointValue(&osap, "padValue");

// ---------------------------------------------- 3 Vertex
EP_ONDATA_RESPONSES readPad(uint8_t* data, uint16_t len);

Endpoint capacitiveEndpoint(&osap, "readPad", readPad);

EP_ONDATA_RESPONSES readPad(uint8_t* data, uint16_t len) {
  int index = data[0];
  // we did the float -> int conversion in js 
  int value = qt_array[index].measure(); // 0 to 1023
  analogWrite(PIN_LED_R, 20);
  uint8_t buf[2];
  buf[0] = value & 0x00ff;
  buf[1] = value >> 8 & 0x00ff;
  capacitiveEndpointValue.write(buf, 2);
  return EP_ONDATA_ACCEPT;
}



// boolean beforeReadPad(void);
// EP_ONDATA_RESPONSES onReadPad(uint8_t* data, uint16_t len);

// Endpoint capacitiveEndpoint(&osap, "readPad", onReadPad, beforeReadPad);

// boolean beforeReadPad(void) {
//   return true;
// }

// EP_ONDATA_RESPONSES onReadPad(uint8_t* data, uint16_t len) { 
//   int index = data[0];
//   // we did the float -> int conversion in js 
//   int value = qt_array[index].measure(); // 0 to 1023
//   capacitiveEndpoint.write(value & 0x00ff);
//   capacitiveEndpoint.write(value >> 8 & 0x00ff);
//   return EP_ONDATA_ACCEPT;
// }

// Endpoint buttonEndpoint(&osap, "buttonState");

void setup() {
  osap.init();
  vp_arduinoSerial.begin();

  // RGB LED
  // digitalWrite(PIN_LED_R, HIGH);
  // digitalWrite(PIN_LED_G, HIGH);
  // digitalWrite(PIN_LED_B, HIGH);
  // pinMode(PIN_LED_R, OUTPUT);
  // pinMode(PIN_LED_G, OUTPUT);
  // pinMode(PIN_LED_B, OUTPUT);

  // CAPACITIVE TOUCH
  for (int i = 0; i < N_PAD; i++) {
    qt_array[i] = Adafruit_FreeTouch(pins_piano[i], OVERSAMPLE_4, RESISTOR_50K, FREQ_MODE_NONE);
    qt_array[i].begin();
  }
}

void loop() {
  osap.loop();
}


// void show_col(const byte* rgb) {
//   // blue LED is about half the brightness, compensate here
//   analogWrite(PIN_LED_R, 255-rgb[0]/2);
//   analogWrite(PIN_LED_G, 255-rgb[1]/2);
//   analogWrite(PIN_LED_B, 255-rgb[2]);
// }
