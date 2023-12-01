#include <osap.h>

#define PIN_POT 26

OSAP_Runtime osap;

OSAP_Gateway_USBSerial serLink(&Serial);

OSAP_Port_DeviceNames namePort("potentiometer");

uint8_t rgb[3] = {0, 0, 255};
boolean ledState = false;

uint16_t value = 0;

size_t onPotentiometerReq(uint8_t* data, size_t len, uint8_t* reply){
  reply[0] = value & 0xFF;
  reply[1] = value >> 8 & 0xFF;
  return 2;
}

void updateRGB() {
  if (ledState) {
    analogWrite(PIN_LED_R, 255-rgb[0]);
    analogWrite(PIN_LED_G, 255-rgb[1]);
    analogWrite(PIN_LED_B, 255-rgb[2]);
  } else {
    analogWrite(PIN_LED_R, 255);
    analogWrite(PIN_LED_G, 255);
    analogWrite(PIN_LED_B, 255);
  }
}

void onRGBPacket(uint8_t* data, size_t len){
  rgb[0] = data[0];
  rgb[1] = data[1];
  rgb[2] = data[2];
  ledState = true;
  updateRGB();
}

void onLEDPacket(uint8_t* data, size_t len){
  ledState = data[0] > 0;
  updateRGB();
}

OSAP_Port_Named getPotentiometerState("getPotentiometerState", onPotentiometerReq);
OSAP_Port_Named setRGB("setRGB", onRGBPacket);
OSAP_Port_Named setLED("setLED", onLEDPacket);

void setup() {
  osap.begin();
  analogWriteResolution(8);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  updateRGB();

  pinMode(PIN_POT, INPUT);
}

uint32_t debounceDelay = 5;
uint32_t lastValueCheck = 0;

void loop() {
  osap.loop();
  if (millis() > lastValueCheck + debounceDelay) {
    value = analogRead(PIN_POT);
    lastValueCheck = millis();
  }
}
