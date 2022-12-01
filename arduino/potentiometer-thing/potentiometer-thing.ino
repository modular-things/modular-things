include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>

#define PIN_POT1 8
#define PIN_POT2 7

// type of board (firmware name)
OSAP osap("potentiometer");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1 Vertex
boolean prePotQuery(void);

Endpoint tofEndpoint(&osap, "potentiometerQuery", prePotQuery);

boolean prePotQuery(void) {
  uint8_t buf[4];
  uint16_t value1 = analogRead(PIN_POT1);
  uint16_t value2 = analogRead(PIN_POT2);
  buf[0] = value1 & 0xFF;
  buf[1] = value1 >> 8 & 0xFF;
  buf[2] = value2 & 0xFF;
  buf[3] = value2 >> 8 & 0xFF;
  tofEndpoint.write(buf, 4);
  return true;
}

void setup() {
  osap.init();
  vp_arduinoSerial.begin();

  pinMode(PIN_POT1, INPUT);
  pinMode(PIN_POT2, INPUT);
}

void loop() {
  osap.loop();
}
