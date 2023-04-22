#include <osap.h>

// -------------------------- Define Pins for R,G and B LEDs, and one Button

#define PIN_R 14
#define PIN_G 15
#define PIN_B 16
#define PIN_BUT 17

// -------------------------- Instantiate the OSAP Runtime, 

OSAP_Runtime osap;

// -------------------------- Instantiate a link layer, 
// handing OSAP the built-in Serial object to send packetized 
// data around the network 

OSAP_Gateway_USBSerial serLink(&Serial);

// -------------------------- Adding this software-defined port 
// allows remote services to find the type-name of this device (here "rgbb")
// and to give it a unique name, that will be stored after reset 

OSAP_Port_DeviceNames namePort("rgbb");

// -------------------------- We track button state (in the loop()), 
// and we use the onButtonReq() handler (that we pass into a named port)
// to reply to messages with the provided string-name "getButtonState"

boolean lastButtonState = false;

size_t onButtonReq(uint8_t* data, size_t len, uint8_t* reply){
  // then write-into reply:
  lastButtonState ? reply[0] = 1 : reply[0] = 0;
  return 1;
}

OSAP_Port_Named getButtonState("getButtonState", onButtonReq);

// -------------------------- We can use similar structures without 
// the reply, simply recieving `data, len` on a packet to "setRGB" here 

void onRGBPacket(uint8_t* data, size_t len){
  analogWrite(PIN_R, data[0]);
  analogWrite(PIN_G, data[1]);
  analogWrite(PIN_B, data[2]);
}

OSAP_Port_Named setRGB("setRGB", onRGBPacket);

// -------------------------- Arduino Setup

void setup() {
  // startup the OSAP runtime,
  osap.begin();
  // setup our hardware... 
  analogWriteResolution(8);
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);
  analogWrite(PIN_R, 255);
  analogWrite(PIN_G, 255);
  analogWrite(PIN_B, 255);
  // pull-down switch, high when pressed
  pinMode(PIN_BUT, INPUT);
}

// we debounce the button somewhat 

uint32_t debounceDelay = 10;
uint32_t lastButtonCheck = 0;

// -------------------------- Arduino Loop

void loop() {
  // as often as possible, we want to operate the OSAP runtime, 
  // this loop listens for messages on link-layers, and handles packets... 
  osap.loop();
  // debounce and set button states, 
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_BUT);
    if(newState != lastButtonState){
      lastButtonState = newState;
    }
  }
}

