#ifndef MAXL_H_
#define MAXL_H_

#include <Arduino.h>
#include "maxl-utes.h"

#define MOTION_MODE_NONE 0
#define MOTION_MODE_VEL 1 
#define MOTION_MODE_QUEUE 2 

// ---------------- setup 

void maxl_init(void);

// ---------------- run, AFAP

// run the loop code as often as possible, w/ log option 
void maxl_loop(boolean log);

// ---------------- config... motor pickins 

// WARNING: does nothing 
void maxl_pushSettings(uint8_t _actuatorID, uint8_t _axisPick, float _spu);

// ---------------- get actuator states 

void maxl_getCurrentStates(maxlStateInterface_t* statePtr);

// ---------------- queue management

void maxl_addSegmentToQueue(maxlSegment_t* seg);

size_t maxl_getSegmentCompleteMsg(uint8_t* msg);

void maxl_evalSegment(maxlState_t* _state, maxlSegment_t* seg, fpint32_t now, boolean log);

void maxl_halt(void);

// ---------------- time management

void maxl_setSystemTime(uint32_t now);

uint32_t maxl_getSystemTime(void);

// ---------------- "user code"

void maxl_tickHardware(maxlState_t* _state, motionVect_t* _deltas);

// ---------------- debuggen 

void maxl_printDebug(void);

#endif 