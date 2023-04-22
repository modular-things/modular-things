#include <osap.h>

// -------------------------- Define Pins for our two Potentiometers

#define PIN_POT1 8
#define PIN_POT2 7

// -------------------------- Instantiate the OSAP Runtime, 

OSAP_Runtime osap;

// -------------------------- Instantiate a link layer, 
// handing OSAP the built-in Serial object to send packetized 
// data around the network 

OSAP_Gateway_USBSerial serLink(&Serial);

// -------------------------- Adding this software-defined port 
// allows remote services to find the type-name of this device (here "potentiometer")
// and to give it a unique name, that will be stored after reset 

OSAP_Port_DeviceNames namePort("potentiometer");

// -------------------------- We can define functions that will be called
// when messages to their function-name are sent to our device. 
// if we use `size_t func(uint8_t* data, size_t len, uint8_t* reply){}`
// whatever is written into reply[] (return the length) will be shipped 
// back to the sender,

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

// in the "rgbb" example, you can see a different function definition, 
// `void func(uint8_t* data, size_t len){}`
// that doesn't bother with the reply, and is attached to a name using a similar method 

// -------------------------- Arduino Setup

void setup() {
  // we have to startup the osap runtime 
  osap.begin();
  // and initialize our hardware 
  pinMode(PIN_POT1, INPUT);
  pinMode(PIN_POT2, INPUT);
}

// -------------------------- Arduino Loop

void loop() {
  // as often as possible, we want to operate the OSAP runtime, 
  // this loop listens for messages on link-layers, and handles packets... 
  osap.loop();
}
