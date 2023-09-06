// C:\Users\jaker\AppData\Local\Arduino15\libraries\osap
#include "motionStateMachine.h"
#include "stepperDriver.h"
#include <osap.h>
#include <vt_endpoint.h>
#include <vp_arduinoSerial.h>
#include <core/ts.h>

// ---------------------------------------------- OSAP central-nugget 
// message-passing memory allocation 
#define OSAP_STACK_SIZE 12
VPacket messageStack[OSAP_STACK_SIZE];
OSAP osap("stepper", messageStack, OSAP_STACK_SIZE);

// ---------------------------------------------- 0th Vertex: OSAP USB Serial
VPort_ArduinoSerial vp_arduinoSerial(&osap, "usbSerial", &Serial);

// ---------------------------------------------- 1th Vertex: Target Requests (pos, or velocity)
EP_ONDATA_RESPONSES onTargetData(uint8_t* data, uint16_t len){
  uint16_t wptr = 1;
  // there's no value in getting clever here: we have two possible requests... 
  if(data[0] == MOTION_MODE_POS){
    float targ = ts_readFloat32(data, &wptr);
    float maxVel = ts_readFloat32(data, &wptr);
    float maxAccel = ts_readFloat32(data, &wptr);
    motion_setPositionTarget(targ, maxVel, maxAccel);
  } else if (data[0] == MOTION_MODE_VEL){
    float targ = ts_readFloat32(data, &wptr);
    float maxAccel = ts_readFloat32(data, &wptr);
    motion_setVelocityTarget(targ, maxAccel);
  }
  return EP_ONDATA_ACCEPT;
}

Endpoint targetEndpoint(&osap, "targetState", onTargetData);

// ---------------------------------------------- 2nd Vertex: Motion State Read 
// queries only, more or less, so
EP_ONDATA_RESPONSES onMotionStateData(uint8_t* data, uint16_t len){ return EP_ONDATA_REJECT; }

boolean beforeMotionStateQuery(void);

Endpoint stateEndpoint(&osap, "motionState", onMotionStateData, beforeMotionStateQuery);

uint8_t stateData[64];

boolean beforeMotionStateQuery(void){
  motionState_t state;
  motion_getCurrentStates(&state);
  uint16_t rptr = 0;
  ts_writeFloat32(state.pos, stateData, &rptr);
  ts_writeFloat32(state.vel, stateData, &rptr);
  ts_writeFloat32(state.accel, stateData, &rptr);
  ts_writeFloat32(state.distanceToTarget, stateData, &rptr);
  ts_writeFloat32(state.maxVel, stateData, &rptr);
  ts_writeFloat32(state.maxAccel, stateData, &rptr);
  ts_writeFloat32(state.twoDA, stateData, &rptr);
  ts_writeFloat32(state.vSquared, stateData, &rptr);
  stateEndpoint.write(stateData, rptr);
  // in-fill current posn, velocity, and acceleration
  return true;
}

// ---------------------------------------------- 3rd Vertex: Set Current Position 
EP_ONDATA_RESPONSES onPositionSetData(uint8_t* data, uint16_t len){
  // should do maxAccel, maxVel, and (optionally) setPosition 
  // upstream should've though of this, so, 
  uint16_t rptr = 0;
  float pos = ts_readFloat32(data, &rptr);
  motion_setPosition(pos);
  return EP_ONDATA_ACCEPT;
}

Endpoint positionSetEndpoint(&osap, "setPosition", onPositionSetData);

// ---------------------------------------------- 4th Vertex: Settings catch-all, 

EP_ONDATA_RESPONSES onSettingsData(uint8_t* data, uint16_t len){
  // it's just <cscale> for the time being, 
  uint16_t rptr = 0;
  float cscale = ts_readFloat32(data, &rptr);
  stepper_setCScale(cscale);
  return EP_ONDATA_ACCEPT;
}

Endpoint settingsEndpoint(&osap, "settings", onSettingsData);

// ---------------------------------------------- 5th Vertex: Limit / Switch Output... non-op at the moment, 

// fair warning, this is unused at the moment... and not set-up, 
// also the limit pin is config'd to look at the interrupt on a scope at the moment, see motionStateMachine.cpp 
#define PIN_BUT 22 
Endpoint buttonEndpoint(&osap, "buttonState");

void setup() {
  Serial.begin(0);
  // uuuh... 
  osap.init();
  // run the commos 
  vp_arduinoSerial.begin();
  // and init the limit / "button" pin 
  pinMode(PIN_BUT, INPUT_PULLUP);
  // ~ important: the stepper code initializes GCLK4, which we use as timer-interrupt
  // in the motion system, so it aught to be initialized first ! 
  stepper_init();
  // another note on the motion system:
  // currently operating at 10kHz, per the below arg... I think this is near the limit 
  // on a D21 (even w/ fixed point), other micros will be faster, 
  // but we want everyone on the same interval, and we will have queues to manage as well 
  // perhaps best is to make sure that speed limits (and SPU:Speed tradeoffs) are well communicated ? 
  motion_init(100);
}

uint32_t debounceDelay = 1;
uint32_t lastButtonCheck = 0;
boolean lastButtonState = false;

uint32_t debugDelay = 1000;
uint32_t lastDebug = 0;

void loop() {
  // do graph stuff
  osap.loop();
  // debounce and set button states, 
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_BUT);
    if(newState != lastButtonState){
      lastButtonState = newState;
      // invert on write: vcc-low is button-down, but we should be "true" when down and "false" when up 
      buttonEndpoint.write(!lastButtonState);
    }
  }
  // periodic print, to debug motion machine 
  // if(lastDebug + debugDelay < millis()){
  //   lastDebug = millis();
  //   motion_printDebug();
  // }
}
