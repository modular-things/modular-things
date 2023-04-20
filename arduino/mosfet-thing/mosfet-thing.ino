#include <osap.h>

#define PIN_GATE 14
#define PIN_LED 15

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("mosfet");

void setGate(uint8_t* data, uint16_t len){
  // we did the float -> int conversion in js 
  uint8_t value = data[0];
  analogWrite(PIN_GATE, value);
  digitalWrite(PIN_LED, value > 0 ? HIGH: LOW);

}

OSAP_Port_Named setGate_port("setGate", onGateData);

void setup() {
  osap.begin();
  analogWriteResolution(8);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_GATE, OUTPUT);
}

void loop() {
  osap.loop();
}
