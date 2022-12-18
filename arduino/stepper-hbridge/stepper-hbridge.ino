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
  uint16_t wptr = 0;
  // there's no value in getting clever here: we have two possible requests... 
  if(data[wptr ++] == MOTION_MODE_POS){
    float targ = ts_readFloat32(data, &wptr);
    float maxVel = ts_readFloat32(data, &wptr);
    float maxAccel = ts_readFloat32(data, &wptr);
    motion_setPositionTarget(targ, maxVel, maxAccel);
  } else if (data[wptr ++] == MOTION_MODE_VEL){
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

uint8_t stateData[12];

boolean beforeMotionStateQuery(void){
  motionState_t state;
  motion_getCurrentStates(&state);
  uint16_t rptr = 0;
  ts_writeFloat32(state.pos, stateData, &rptr);
  ts_writeFloat32(state.vel, stateData, &rptr);
  ts_writeFloat32(state.accel, stateData, &rptr);
  stateEndpoint.write(stateData, 12);
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
Endpoint buttonEndpoint(&osap, "buttonState");

void setup() {
  Serial.begin(0);
  // ~ important: the stepper code initializes GCLK4, which we use as timer-interrupt
  // in the motion system, so it aught to be initialized first ! 
  stepper_init();
  // another note on the motion system:
  // at the moment, we have a relatively small absolute-maximum speed: say the integrator interval is 250us, 
  // we have 0.00025 seconds between ticks, for a max of 4000 steps / second... 
  // we are then microstepping at 1/4th steps, for 800 steps per motor revolution, (from a base of 200)
  // meaning we can make only 5 revs / sec, or 300 rippums (RPM), 
  // with i.e. a 20-tooth GT2 belt, we have 40mm of travel per revolution, making only 200mm/sec maximum traverse 
  // this is not pitiful, but not too rad, and more importantly is that we will want to communicate these limits 
  // to users of the motor - so we should outfit a sort of settings-grab function, or something ? 
  motion_init(250);
  // uuuh... 
  osap.init();
  // run the commos 
  vp_arduinoSerial.begin();
  pinMode(PIN_BUT, INPUT_PULLUP);
}

uint32_t debounceDelay = 1;
uint32_t lastButtonCheck = 0;
boolean lastButtonState = false;

void loop() {
  // do graph stuff
  osap.loop();
  // if(lastIntegration + integratorInterval < micros()){
  //   // stepper_step(1, true);
  //   lastIntegration = micros();
  //   motion_integrate();
  // }
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
}
