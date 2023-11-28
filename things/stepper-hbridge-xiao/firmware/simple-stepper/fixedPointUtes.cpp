#include "fixedPointUtes.h"

// ---------------------------------------------- Fixed Point Maths  

// FP 16.16 puts 65k ticks in front and in behind, 
// for i.e. max rate of 32k 'units' (it's signed) 
// which correlates to 9830 RPM for a 200-full-step stepper 
const int32_t   fp_scale = 16;
const float     fp_float_max =  32768.0F;
const float     fp_float_min = -32768.0F;
const int32_t   fp_int_max =    32768;
const int32_t   fp_int_min =   -32768;
const int64_t   fp_32b_max =    2147483648;
const int64_t   fp_32b_min =   -2147483648;

// hmmm https://www.youtube.com/watch?v=S12qx1DwjVk& at ~ 18:00 
float fp_fixed32ToFloat(fpint32_t fixed){
  return ((float)fixed / (float)(1 << fp_scale));
}

// actually this is unclear to me... https://www.youtube.com/watch?v=S12qx1DwjVk& at 16:57
fpint32_t fp_floatToFixed32(float flt){
  if(flt > fp_float_max) flt = fp_float_max;
  if(flt < fp_float_min) flt = fp_float_min;
  return (flt * (float)(1 << fp_scale));
}

int32_t fp_fixed32ToInt32(fpint32_t fixed){
  return (fixed >> fp_scale);
}

fpint32_t fp_int32ToFixed32(int32_t inty){
  if(inty > fp_int_max) inty = fp_int_max;
  if(inty < fp_int_min) inty = fp_int_min;
  return (inty << fp_scale); 
}

fpint32_t fp_mult32x32(fpint32_t a, fpint32_t b){
  // the result of this mult can be > our max possible 32b-wide fixedp, 
  int64_t res = ((int64_t)(a) * (int64_t)(b)) >> fp_scale;
  // so we guard against that, since it is cast back to 32b on exit, 
  if(res > fp_32b_max) res = fp_32b_max;
  if(res < fp_32b_min) res = fp_32b_min;
  return res;
}

// we could instead do mult w/ some fancy shifting, for speed (no 64b at all)
// but it also makes for tricky overflow / etc; I'm not going to get into this yet
// https://www.youtube.com/watch?v=npQF28g6s_k& 7:40 
// fp_int32_t fp_mult(fpint32_t a, fpint32_t b){
//   return ((a >> 6) * (b >> 6)) >> 4;
// }

fpint32_t fp_div32x32(fpint32_t num, fpint32_t denum){
  return ((int64_t)(num) << fp_scale) / denum;
}

// // big-div, 
// fpint64_t fp_calcStopDistance(fpint32_t _vel, fpint32_t _maxAccel){
//   // return 0;
//   int64_t _velSq = ((int64_t)(_vel) * (int64_t)(_vel)) >> fp_scale;
//   int64_t _accelTwo = ((int64_t)(_maxAccel) * (int64_t)(fp_int32ToFixed32(2))) >> fp_scale;
//   return (_velSq << fp_scale) / _accelTwo;
// }