#include <osap.h>

// -------------------------- Define Pins for R,G and B LEDs, and two buttons
#define PIN_LED_R 17
#define PIN_LED_G 16
#define PIN_LED_B 25

#define PIN_A 29
#define PIN_B 6

// -------------------------- Instantiate the OSAP Runtime, 

OSAP_Runtime osap;

// -------------------------- Instantiate a link layer, 
// handing OSAP the built-in Serial object to send packetized 
// data around the network 

OSAP_Gateway_USBSerial serLink(&Serial);

// -------------------------- Adding this software-defined port 
// allows remote services to find the type-name of this device (here "rgbb")
// and to give it a unique name, that will be stored after reset 

OSAP_Port_DeviceNames namePort("button");

boolean buttonStateA = false;
boolean buttonStateB = false;
uint8_t rgb[3] = {0, 0, 255};
boolean ledState = false;

size_t onButtonAReq(uint8_t* data, size_t len, uint8_t* reply){
  buttonStateA ? reply[0] = 1 : reply[0] = 0;
  return 1;
}

size_t onButtonBReq(uint8_t* data, size_t len, uint8_t* reply){
  buttonStateB ? reply[0] = 1 : reply[0] = 0;
  return 1;
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

OSAP_Port_Named getButtonStateA("getButtonA", onButtonAReq);
OSAP_Port_Named getButtonStateB("getButtonB", onButtonBReq);
OSAP_Port_Named setRGB("setRGB", onRGBPacket);
OSAP_Port_Named setLED("setLED", onLEDPacket);

// -------------------------- Arduino Setup

void setup() {
  // startup the OSAP runtime,
  osap.begin();
  // setup our hardware... 
  analogWriteResolution(8);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  updateRGB();
  
  pinMode(PIN_A, INPUT_PULLUP);
  pinMode(PIN_B, INPUT_PULLUP);
}

// we debounce the button somewhat 

uint32_t debounceDelay = 5;
uint32_t lastButtonCheck = 0;

// -------------------------- Arduino Loop

void loop() {
  // as often as possible, we want to operate the OSAP runtime, 
  // this loop listens for messages on link-layers, and handles packets... 
  osap.loop();
  // debounce and set button states, 
  if (millis() > lastButtonCheck + debounceDelay) {
    lastButtonCheck = millis();
    buttonStateA = !digitalRead(PIN_A);
    buttonStateB = !digitalRead(PIN_B);
  }
}
