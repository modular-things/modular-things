// C:\Users\jaker\AppData\Local\Arduino15\libraries\osap
#include "thwapperDriver.h"
#include <osap.h>

#define LED_PIN 13 

// ---------------------------------------------- OSAP central-nugget 

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("thwapper");

size_t thwap(uint8_t* data, size_t len, uint8_t* reply){
  // should rx a midi gram basically, right? 
  // then... depending on solenoid-or-hummer config, do 
  // a thwap w/ velocity mapped to time-on, 
  // or a note w/ some amout of decay ? 
  // so... note byte would be cha / chb, 
  // velocity let's just say time in ms ? 

  // ... to hardware test... 
  thwapper_a_strike(data[1]);

  // ... idk if we do want to transport anything back, probs not ? 
  reply[0] = 44;
  return 1;
}

OSAP_Port_Named thwapPort("thwap", thwap);

void setup() {
  pinMode(LED_PIN, OUTPUT);
  thwapper_begin();
  osap.begin();
}

uint32_t lastBlink = 0; 
uint32_t blinkPeriod = 50;

void loop() {
  if(lastBlink + blinkPeriod < millis()){
    lastBlink = millis();
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    // thwapper_a_strike(200);
  }
  thwapper_loop();
  osap.loop();
}
