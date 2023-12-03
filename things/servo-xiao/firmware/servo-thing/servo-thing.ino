#include <osap.h>
#include <Servo.h>

#define PIN_SERVO 29

Servo servo;

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("servo");

uint8_t rgb[3] = {0, 0, 255};
boolean ledState = false;

void writeMicroseconds(uint8_t* data, size_t len) {
  uint16_t pulse_us = data[1] * 256 + data[0];

  servo.writeMicroseconds(pulse_us);
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

OSAP_Port_Named setRGB("setRGB", onRGBPacket);
OSAP_Port_Named setLED("setLED", onLEDPacket);
OSAP_Port_Named writeMicroseconds_port("writeMicroseconds", writeMicroseconds);

void setup() {
  osap.begin();
  analogWriteResolution(8);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  updateRGB();

  servo.attach(PIN_SERVO, 500, 2500);
}

void loop() {
  osap.loop();
}
