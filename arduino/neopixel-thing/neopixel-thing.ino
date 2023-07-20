// #include <osap.h>
// #include <LSM6.h> // by Pololu 

#include <Wire.h>
#include <osap.h>
#include "maxl.h"

#include <Adafruit_NeoPixel.h>

#define PIXEL_COUNT 8 
// or GPIO-4, idk 
#define PIXEL_PIN 4 
#define BRIGHTNESS 50

Adafruit_NeoPixel strip(PIXEL_COUNT, PIXEL_PIN, NEO_GRBW + NEO_KHZ800);

// maxl instance, for timing 
MAXL maxl; 

// our comms 
OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("neopixelThing");
OSAP_Port_MessageEscape debugPort;

// ---------------------------------------------- MAXL over MUTTS 

void onMaskUpdate(uint8_t mask){
  for(uint8_t p = 0; p < 8; p ++){
    if(mask & (1 << p)){
      strip.setPixelColor(p, strip.Color(0, 0, 0, 25));
    } else {
      strip.setPixelColor(p, strip.Color(0, 0, 0, 0));
    }
  }
  strip.show();
}

MAXL_TrackEvent8Bit pixelTrack("neopixelBitmap", onMaskUpdate);

// ---------------------------------------------- MAXL over MUTTS 

size_t maxlMessageInterface(uint8_t* data, size_t len, uint8_t* reply){
  return maxl.messageHandler(data, len, reply);
}

OSAP_Port_Named maxlMessage_port("maxlMessages", maxlMessageInterface);

void setup() {
  // startup pix 
  strip.begin();
  strip.show();
  strip.setBrightness(BRIGHTNESS);

  osap.begin();
  maxl.begin();
  osap.attachDebugFunction(debugPort.escape);
  // setup and wait for serial 
  // we'll blink the user-led 
  pinMode(LED_BUILTIN, OUTPUT);
}

uint32_t lastBlink = 0;
uint32_t intervalBlink = 50;
bool lastPixelState = false;

void loop() {
  // lewp 
  osap.loop();
  maxl.loop();
  // delay(10);
  // blinky / act 
  if(millis() > lastBlink + intervalBlink){
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    lastBlink = millis();
    // try write / rewrite 
    for(uint8_t p = 0; p < PIXEL_COUNT; p ++){
      // if(lastPixelState){
      //   strip.setPixelColor(p, strip.Color(0, 0, 0, 255));
      // } else {
      //   strip.setPixelColor(p, strip.Color(0, 0, 0, 0));
      // }
    }
    // strip.show();
    lastPixelState = !lastPixelState;
  }
}