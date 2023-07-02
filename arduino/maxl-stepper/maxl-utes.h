#ifndef MAXL_UTES_H_
#define MAXL_UTES_H_

#include <Arduino.h>

// ---------------------------------------------- structs and interfaes 

// we get explicit about fixed point 
typedef int32_t fpint32_t;

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

