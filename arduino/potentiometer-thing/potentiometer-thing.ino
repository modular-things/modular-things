#include <osap.h>

#define PIN_POT1 8
#define PIN_POT2 7

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("potentiometer");

size_t readPotentiometer(uint8_t* data, size_t len, uint8_t* reply) {
  uint16_t value1 = analogRead(PIN_POT1);
  uint16_t value2 = analogRead(PIN_POT2);

  reply[0] = value1 & 0xFF;
  reply[1] = value1 >> 8 & 0xFF;
  reply[2] = value2 & 0xFF;
  reply[3] = value2 >> 8 & 0xFF;

  return 4;
}

OSAP_Port_Named readPotentiometer_port("readPotentiometer", readPotentiometer);

void setup() {
  osap.begin();

  pinMode(PIN_POT1, INPUT);
  pinMode(PIN_POT2, INPUT);
}

void loop() {
  osap.loop();
}
