#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>

// ---------------------------------------------- Pins
#define PIN_GATE 14
#define PIN_LED 15

// ---------------------------------------------- OSAP central-nugget 
OSAP osap("mosfet");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: RGB Inputs Endpoint 
EP_ONDATA_RESPONSES onGateData(uint8_t* data, uint16_t len){
  // we did the float -> int conversion in js 
  uint8_t value = data[0];
  analogWrite(PIN_GATE, value);
  digitalWrite(PIN_LED, value > 0 ? HIGH: LOW);

  return EP_ONDATA_ACCEPT;
}

Endpoint gateEndpoint(&osap, "gateValue", onGateData);

void setup() {
  osap.init();
  vp_arduinoSerial.begin();
  analogWriteResolution(8);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_GATE, OUTPUT);
}

void loop() {
  osap.loop();
}
