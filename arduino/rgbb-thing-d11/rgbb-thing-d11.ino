// C:\Users\jaker\AppData\Local\Arduino15\libraries\osap
#include <osap.h>
// #include <vt_endpoint.h>
// #include <vp_arduinoSerial.h>

// ---------------------------------------------- Pins
#define PIN_R 15
#define PIN_G 16
#define PIN_B 17
#define PIN_BUT 7

// ---------------------------------------------- OSAP central-nugget 
OSAP osap("rgbbThing");

/*

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: RGB Inputs Endpoint 
EP_ONDATA_RESPONSES onRGBData(uint8_t* data, uint16_t len){
  // we did the float -> int conversion in js 
  analogWrite(PIN_R, data[0]);
  analogWrite(PIN_G, data[1]);
  analogWrite(PIN_B, data[2]);
  return EP_ONDATA_ACCEPT;
}

Endpoint rgbEndpoint(&osap, "rgbValues", onRGBData);

// ---------------------------------------------- 2nd Vertex: Button Endpoint 
Endpoint buttonEndpoint(&osap, "buttonState");

*/

void setup() {
  // run the commos 
  // vp_arduinoSerial.begin();
  // "hardware"
  analogWriteResolution(8);
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);
  analogWrite(PIN_R, 255);
  analogWrite(PIN_G, 255);
  analogWrite(PIN_B, 255);
  pinMode(PIN_BUT, INPUT_PULLUP);
}

uint32_t debounceDelay = 10;
uint32_t lastButtonCheck = 0;
boolean lastButtonState = false;

void loop() {
  // do graph stuff
  // osap.loop();
  // debounce and set button states, 
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_BUT);
    if(newState != lastButtonState){
      lastButtonState = newState;
      // invert on write: vcc-low is button-down, but we should be "true" when down and "false" when up 
      // buttonEndpoint.write(!lastButtonState);
    }
  }
}

// prg size log
// 9828 (blank arduino)
// 10844 (leds, blinking) 
// 17712 (+ osap w/ no vertices)
// 18956 (+ serial vport)
// 21280 (+ 2x endpoints)
// 21960 (+ handlers and button code)
// 23944 (+ readFloat)

// prg size squish (d21) lock 
// started as: overflowing 5024k flash, overflowing 1020 bytes ram 
// reducing stack sizes (256 -> 128) and max-num-endpoints (64-32) and I can fit it in RAM, but still 5k over in flash 
// I suspect that error messages are stuffing the flash, so I'll try rm'ing some of those, have 5024 over so far 
// rm'ing the code that prints error messages... 4740 overflowing, 
// ------------ the bootloader is 4k, so we can start with that, non ? 