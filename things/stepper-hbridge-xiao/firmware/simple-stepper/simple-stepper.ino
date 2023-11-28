#include "motionStateMachine.h"
#include "stepperDriver.h"
#include <osap.h>

// using the RP2040 at 200MHz 

#define PIN_LIMIT 26 

/*

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("stepper");

// ---------------------------------------------- baby needs to serialize fluts 

union chunk_float32 {
  uint8_t bytes[4];
  float f;
};

float ts_readFloat32(unsigned char* buf, uint16_t* ptr){
  chunk_float32 chunk = { .bytes = { buf[(*ptr)], buf[(*ptr) + 1], buf[(*ptr) + 2], buf[(*ptr) + 3] } };
  (*ptr) += 4;
  return chunk.f;
}

void ts_writeFloat32(float val, volatile unsigned char* buf, uint16_t* ptr){
  chunk_float32 chunk;
  chunk.f = val;
  buf[(*ptr)] = chunk.bytes[0]; buf[(*ptr) + 1] = chunk.bytes[1]; buf[(*ptr) + 2] = chunk.bytes[2]; buf[(*ptr) + 3] = chunk.bytes[3];
  (*ptr) += 4;
}

// ---------------------------------------------- set a new target 

void setTarget(uint8_t* data, size_t len){
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
}

OSAP_Port_Named setTarget_port("setTarget", setTarget);

// ---------------------------------------------- get the current states 

size_t getMotionStates(uint8_t* data, size_t len, uint8_t* reply){
  motionState_t state;
  motion_getCurrentStates(&state);
  uint16_t wptr = 0;
  // in-fill current posn, velocity, and acceleration
  ts_writeFloat32(state.pos, reply, &wptr);
  ts_writeFloat32(state.vel, reply, &wptr);
  ts_writeFloat32(state.accel, reply, &wptr);
  // return the data length 
  return wptr;
}

OSAP_Port_Named getMotionStates_port("getMotionStates", getMotionStates);

// ---------------------------------------------- set a new position 

void setPosition(uint8_t* data, size_t len){
  // should do maxAccel, maxVel, and (optionally) setPosition
  // upstream should've though of this, so,
  uint16_t rptr = 0;
  float pos = ts_readFloat32(data, &rptr);
  motion_setPosition(pos);
}

OSAP_Port_Named setPosition_port("setPosition", setPosition);

// ---------------------------------------------- set..tings 

void writeSettings(uint8_t* data, size_t len){
  // it's just <cscale> for the time being,
  uint16_t rptr = 0;
  float cscale = ts_readFloat32(data, &rptr);
  // stepper_setCScale(cscale);
}

OSAP_Port_Named writeSettings_port("writeSettings", writeSettings);

// ---------------------------------------------- get the state of the limit switch

// this is lifted here, we set it periodically in the loop (to debounce) 
boolean lastButtonState = false;

size_t getLimitState(uint8_t* data, size_t len, uint8_t* reply){
  lastButtonState ? reply[0] = 1 : reply[0] = 0;
  return 1;
}

OSAP_Port_Named getLimitState_port("getLimitState", getLimitState);
*/

void setup() {
  // DEBUG 
  Serial.begin();
  // startup the stepper hardware 
  stepper_init();
  // setup motion, pick an integration interval (us) 
  motion_init(64);
  // startup the network transporter 
  // osap.begin();
  // and our limit pin 
  // pinMode(PIN_LIMIT, INPUT_PULLDOWN);
  // DEBUG:
  stepper_setAmplitude(256);
}

uint32_t debounceDelay = 1;
uint32_t lastButtonCheck = 0;

uint32_t flipInterval = 2500;
uint32_t lastFlip = 0;

uint32_t debugInterval = 250;
uint32_t lastDebug = 0;

float sampleVel = 1000.0F;

// TODO:
/*
- do position-target-ingest and trajectory-authorship... 
*/

motionState_t states;

void loop() {
  // do transport stuff 
  // osap.loop();

  // debug
  if(lastDebug + debugInterval < millis()){
    motion_debug();
    lastDebug = millis();
    // motion_getCurrentStates(&states);
    // Serial.println(String(millis()) 
    //   + "\tpos: \t" + String(states.pos, 4) 
    //   + "\tvel: \t" + String(states.vel, 4) 
    //   + "\tacc: \t" + String(states.accel, 4)
    // );
  }

  // set / res velocities, 
  if(lastFlip + flipInterval < millis()){
    lastFlip = millis();
    motion_setVelocityTarget(sampleVel, 5000.0F);
    sampleVel = - sampleVel;
  }

  /*
  // debounce and set button states,
  if(lastButtonCheck + debounceDelay < millis()){
    lastButtonCheck = millis();
    boolean newState = digitalRead(PIN_LIMIT);
    if(newState != lastButtonState){
      lastButtonState = newState;
    }
  }
  */
}
