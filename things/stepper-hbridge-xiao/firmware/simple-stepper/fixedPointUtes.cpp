#include "fixedPointUtes.h"

// ---------------------------------------------- Fixed Point Maths  

// TODO is it ?? 
// trying this out with 15.17 floating points: 
// 32768 ticks ahead of the dot, 
// 131072 ticks behind it... 
// also it's signed, 
const int32_t fp_scale = 17;

// hmmm https://www.youtube.com/watch?v=S12qx1DwjVk& at ~ 18:00 
float fp_fixed32ToFloat(fpint32_t fixed){
  return ((float)fixed / (float)(1 << fp_scale));
}

// actually this is unclear to me... https://www.youtube.com/watch?v=S12qx1DwjVk& at 16:57
// TODO: guard against big entrance floats (bigger than 32k) 
fpint32_t fp_floatToFixed32(float flt){
  return (flt * (float)(1 << fp_scale));
}

int32_t fp_fixed32ToInt32(fpint32_t fixed){
  return (fixed >> fp_scale);
}

// TODO: if int32 is > 32K !! 
fpint32_t fp_int32ToFixed32(int32_t inty){
  return (inty << fp_scale); 
}

// w/ fixed point mult, we have some out-of-ranging trouble, 
// we can maybe do this w/ 64-bit ints, but it's going to suck a little bit of time
// though still better than the floating point libs, 
// TODO: guard overflow when we cast back to fpint32_t ! 
fpint32_t fp_mult32x32(fpint32_t a, fpint32_t b){
  return ((int64_t)(a) * (int64_t)(b)) >> fp_scale;
}

// we can instead do it w/ some fancy shifting, but I'm not going to get into this yet: 
// leaving it as a potential speedup... 
// https://www.youtube.com/watch?v=npQF28g6s_k& 7:40 
// fp_int32_t fp_mult(fpint32_t a, fpint32_t b){
//   return ((a >> 6) * (b >> 6)) >> 4;
// }

// division...
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