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

void maxl_pushSettings(uint8_t _actuatorID, uint8_t _axisPick, float _spu);

// ---------------- queue management

void maxl_addSegmentToQueue(maxlSegmentLinearMotion_t* seg);

size_t maxl_getSegmentCompleteMsg(uint8_t* msg);

void maxl_evalSegment(fpint32_t* _pos, fpint32_t* _vel, maxlSegmentLinearMotion_t* seg, fpint32_t now, boolean log);

void maxl_halt(void);

// ---------------- time management

void maxl_setSystemTime(uint32_t now);

uint32_t maxl_getSystemTime(void);

// ---------------- "user code"

void maxl_tickHardware(fpint32_t _state, fpint32_t _delta);

// ---------------- debuggen 

void maxl_printDebug(void);

#endif 