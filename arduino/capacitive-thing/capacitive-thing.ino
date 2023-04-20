#include "Adafruit_FreeTouch.h"
#include <osap.h>

#define PIN_LED_R 16
#define PIN_LED_G 22
#define PIN_LED_B 17

#define N_PAD 6

const int pins_piano[N_PAD] = {2, 3, 4, 5, 6, 7};

Adafruit_FreeTouch qt_array[N_PAD];

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("accelerometer");

void setRGB(uint8_t* data, uint16_t len) {
  analogWrite(PIN_LED_R, data[0]);
  analogWrite(PIN_LED_G, data[1]);
  analogWrite(PIN_LED_B, data[2]);

  if (data[0] == 255 && data[1] == 255 && data[2] == 255) {
    digitalWrite(PIN_LED_R, 1);
    digitalWrite(PIN_LED_G, 1);
    digitalWrite(PIN_LED_B, 1);
  }

}

size_t readPads(uint8_t* data, size_t len, uint8_t* reply) {

  for(uint8_t p = 0; p < N_PAD; p ++){
    uint16_t measurement = qt_array[p].measure();
    reply[p*2] = measurement & 0xFF;
    reply[(p*2)+1] = measurement >> 8 & 0xFF;
  }
  
  return N_PAD * 2;
}


OSAP_Port_Named readPads_port("readPads", readPads);
OSAP_Port_Named setRGB_port("setRGB", setRGB);




void setup() {
  osap.begin();
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