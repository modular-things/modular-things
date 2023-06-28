#ifndef MAXL_H_
#define MAXL_H_

#include <Arduino.h>
#include "maxl-utes.h"

#define MOTION_MODE_NONE 0
#define MOTION_MODE_VEL 1 
#define MOTION_MODE_QUEUE 2 

// ---------------- setup 

void motion_init(void);

// ---------------- run, AFAP

// run the loop code as often as possible, w/ log option 
void motion_loop(boolean log);

// ---------------- get actuator states 

void motion_getCurrentStates(motionStateInterface_t* statePtr);

// ---------------- queue management

void motion_addSegmentToQueue(motionSegment_t* seg);

size_t motion_getSegmentCompleteMsg(uint8_t* msg);

void motion_evalSegment(motionState_t* _state, motionSegment_t* seg, fpint32_t now, boolean log);

void motion_halt(void);

// ---------------- time management

void motion_setSystemTime(uint32_t now);

uint32_t motion_getSystemTime(void);

// ---------------- "user code"

void motion_tickHardware(motionState_t* _state, motionVect_t* _deltas);

// ---------------- debuggen 

void motion_printDebug(void);

#endif 