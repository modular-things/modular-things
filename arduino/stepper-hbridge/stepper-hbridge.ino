// C:\Users\jaker\AppData\Local\Arduino15\libraries\osap
#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>

// ---------------------------------------------- Application State 

// oh shit, we might need to use fixed point out here, non ? 
// and consider... we ~ should be using steps/second at this level, doing SPU above... 
volatile float pos = 0.0F;
volatile float vel = 0.0F;
volatile float accel = 0.0F;
// and settings 
float maxAccel = 100.0F;  // units / sec 
float maxVel = 100.0F;    // units / sec  

// ---------------------------------------------- OSAP central-nugget 
OSAP osap("stepper");

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: Position Requests
EP_ONDATA_RESPONSES onPosData(uint8_t* data, uint16_t len){
  // set target pos, optional <accel>, <vf>, <vi> to use 
  // always is from-current-pos... 
  return EP_ONDATA_ACCEPT;
}

Endpoint posEndpoint(&osap, "gotoPosition", onPosData);

// ---------------------------------------------- 2nd Vertex: Velocity Requests
EP_ONDATA_RESPONSES onVelData(uint8_t* data, uint16_t len){
  // set target velocity, optional <accel>
  return EP_ONDATA_ACCEPT;
}

Endpoint velEndpoint(&osap, "gotoPosition", onVelData);

// ---------------------------------------------- 3rd Vertex: Motion State
// queries only, more or less, so
EP_ONDATA_RESPONSES onMotionStateData(uint8_t* data, uint16_t len){return EP_ONDATA_REJECT;}

boolean beforeMotionStateQuery(void);

Endpoint stateEndpoint(&osap, "gotoPosition", onMotionStateData, beforeMotionStateQuery);

boolean beforeMotionStateQuery(void){
  // in-fill current posn, velocity, and acceleration
  return true;
}

// ---------------------------------------------- 4th Vertex: Set Position
EP_ONDATA_RESPONSES onPosSetData(uint8_t* data, uint16_t len){
  // upstream should've though of this, so, 
  uint16_t rptr = 0;
  float _pos = ts_readFloat32(data, &rptr);
  noInterrupts();
  pos = _pos;
  interrupts();
  return EP_ONDATA_ACCEPT;
}

Endpoint settingsEndpoint(&osap, "gotoPosition", onPosSetData);


// ---------------------------------------------- 5th Vertex: Settings
EP_ONDATA_RESPONSES onSettingsData(uint8_t* data, uint16_t len){
  // ... max accel, max vel, that's it ? 
  return EP_ONDATA_ACCEPT;
}

Endpoint settingsEndpoint(&osap, "gotoPosition", onSettingsData);

// ---------------------------------------------- 6th Vertex: Limit / Switch Output 
Endpoint buttonEndpoint(&osap, "buttonState");

void setup() {
  // uuuh... 
  osap.init();
  // run the commos 
  vp_arduinoSerial.begin();
}

void loop() {
  // do graph stuff
  osap.loop();
}