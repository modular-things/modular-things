#ifndef MAXL_UTES_H_
#define MAXL_UTES_H_

#include <Arduino.h>

// TODO would be a refactor for flexible motion-dof sizes 
#define MAXL_MAX_DOF 7 
#define MAXL_QUEUE_LEN 32 

// ---------------------------------------------- structs and interfaes 

// we get explicit about fixed point 
typedef int32_t fpint32_t;

// ---------------- position-al segments 

typedef struct maxlSegmentLinearMotion_t {
  // system-reckoned start and end times, in micros, 
  uint32_t tStart_us = 0;
  uint32_t tEnd_us = 0;
  // sequencing aid,
  boolean isLastSegment = false;
  // valuuuues:
  // a start position and total distance, 
  fpint32_t start = 0;
  // start rate, accel slope(s), cruise rate, end rate 
  fpint32_t vi = 0;
  fpint32_t accel = 0;
  fpint32_t vmax = 0;
  fpint32_t vf = 0;
  // pre-calculated phase integrals, 
  fpint32_t distTotal = 0;
  fpint32_t distAccelPhase = 0;
  fpint32_t distCruisePhase = 0;
  // phase times, 
  // i.e. when to stop accelerating, when to start decelerating 
  fpint32_t tAccelEnd = 0;
  fpint32_t tCruiseEnd = 0;
  // now some queue management flags / links; 
  // ready/set, token 
  boolean isOccupied = false;
  // linking 
  maxlSegmentLinearMotion_t* next;
  maxlSegmentLinearMotion_t* previous;
  uint32_t indice = 0;  // track own location, 
} maxlSegmentLinearMotion_t;

// ---------------------------------------------- fixedp maths  

float fp_fixed32ToFloat(fpint32_t fixed);

fpint32_t fp_floatToFixed32(float flt);

int32_t fp_fixed32ToInt32(fpint32_t fixed);

fpint32_t fp_int32ToFixed32(int32_t inty);

fpint32_t fp_mult32x32(fpint32_t a, fpint32_t b);

fpint32_t fp_div32x32(fpint32_t num, fpint32_t denum);

// ---------------------------------------------- serialization 

union chunk_float32 {
  uint8_t bytes[4];
  float f;
};

union chunk_uint32 {
  uint8_t bytes[4];
  uint32_t u;
};

union chunk_int32 {
  uint8_t bytes[4];
  int32_t i;
}; 

void ts_writeUint8(uint8_t val, volatile unsigned char* buf, uint16_t* ptr);
void ts_writeUint32(uint32_t val, volatile unsigned char* buf, uint16_t* ptr);
void ts_writeFloat32(float val, volatile unsigned char* buf, uint16_t* ptr);

boolean ts_readBoolean(unsigned char* buf, uint16_t* ptr);
uint8_t ts_readUint8(unsigned char* buf, uint16_t* ptr);
uint32_t ts_readUint32(unsigned char* buf, uint16_t* ptr);
int32_t ts_readInt32(unsigned char* buf, uint16_t* ptr);
float ts_readFloat32(unsigned char* buf, uint16_t* ptr);

#endif 

