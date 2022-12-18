#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>

// ---------------------------------------------- Pins
#define PIN_R 14
#define PIN_G 15
#define PIN_B 16
#define PIN_BUT 17

// message-passing memory allocation 
#define OSAP_STACK_SIZE 10
VPacket messageStack[OSAP_STACK_SIZE];
// ---------------------------------------------- OSAP central-nugget 
OSAP osap("rgbb", messageStack, OSAP_STACK_SIZE);

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

void setup() {
  // uuuh... 
  osap.init();
  // run the commos 
  vp_arduinoSerial.begin();
  // "hardware"
  analogWriteResolution(8);
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);
  analogWrite(PIN_R, 255);
  analogWrite(PIN_G, 255);
  analogWrite(PIN_B, 255);
  pinMode(PIN_BUT, INPUT);
  // pull-down switch, high when pressed
}

uint32_t debounceDelay = 10;
uint32_t lastButtonCheck = 0;
boolean lastButtonState = false;

void loop() {
  // do graph stuff
  osap.loop();
  // debounce and set button states, 
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_BUT);
    if(newState != lastButtonState){
      lastButtonState = newState;
      buttonEndpoint.write(lastButtonState);
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
