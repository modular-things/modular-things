#include "Adafruit_FreeTouch.h"
#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>

#define PIN_LED_R 16
#define PIN_LED_G 22
#define PIN_LED_B 17

#define N_PAD 6

const int pins_piano[N_PAD] = {2, 3, 4, 5, 6, 7};

Adafruit_FreeTouch qt_array[N_PAD];

// type of board (firmware name)
OSAP osap("capacitive");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
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

Endpoint rgbEndpoint(&osap, "setRGB", setRGB);

// ---------------------------------------------- 2 Vertex
boolean prePadQuery(void);

Endpoint capacitiveEndpoint(&osap, "capacitivePads", prePadQuery);

boolean prePadQuery(void){
  // stuff vals into yonder buffer
  uint8_t buf[N_PAD * 2];
  uint16_t wptr = 0;
  for(uint8_t p = 0; p < N_PAD; p ++){
    // void ts_writeUint16(uint16_t val, unsigned char* buf, uint16_t* ptr); 
    ts_writeUint16(qt_array[p].measure(), buf, &wptr);
  }
  capacitiveEndpoint.write(buf, N_PAD * 2);
  return true;
}

void setup() {
  osap.init();
  vp_arduinoSerial.begin();
  // RGB LED
  // digitalWrite(PIN_LED_R, HIGH);
  // digitalWrite(PIN_LED_G, HIGH);
  // digitalWrite(PIN_LED_B, HIGH);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  // CAPACITIVE TOUCH
  for (int i = 0; i < N_PAD; i++) {
    qt_array[i] = Adafruit_FreeTouch(pins_piano[i], OVERSAMPLE_4, RESISTOR_50K, FREQ_MODE_NONE);
    qt_array[i].begin();
  }
}

void loop() {
  osap.loop();
}