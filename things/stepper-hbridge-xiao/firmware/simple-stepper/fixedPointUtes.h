#ifndef FIXEDPOINT_UTES_H_
#define FIXEDPOINT_UTES_H_

#include <Arduino.h>

// ---------------------------------------------- structs and interfaes 

// we get explicit about fixed point 
typedef int32_t fpint32_t;

// ---------------------------------------------- fixedp conversions  

float fp_fixed32ToFloat(fpint32_t fixed);

fpint32_t fp_floatToFixed32(float flt);

int32_t fp_fixed32ToInt32(fpint32_t fixed);

fpint32_t fp_int32ToFixed32(int32_t inty);

// ---------------------------------------------- fixedp maths   

fpint32_t fp_mult32x32(fpint32_t a, fpint32_t b);

fpint32_t fp_div32x32(fpint32_t num, fpint32_t denum);

#endif 