## 2022 12 14 

OK today I'm trying to whip the integrator up to use fixed point maths... and bring the integrator rate way up, I think as a baseline the current integrator runs in ~ 100us, or something? I run the integrator on a 250us period, so hopefully we can crank that to a ~ 50us integrator period, with 5us integration step or less. 

I think I have the basics here, 

```cpp
// where's the radix... picking 16 (the middle) ~ arbitrarily 
// so we have 2^16 = 65 536 dots after the pt, (0.000015...)
// and 2^16 = 65 536 dots in front of the pt, so we have max vals (accel, pos, etc) +/- 32.5k, not bad, 
const int32_t fp_scale = 16;

// get explicit abt which are fixed point ints, 
typedef int32_t fpint32_t;

// and ops w/ em 
float fp_fixedToFloat(fpint32_t fixed);
fpint32_t fp_floatToFixed(float flt);
int32_t fp_fixedToInt(fpint32_t fixed);
fpint32_t fp_intToFixed(int32_t inty);

// addition & subtraction is just integer addition, straight up 
// but w/ multiplication we need a little scaling, so: 
fpint32_t fp_mult(fpint32_t a, fpint32_t b);
fpint32_t fp_div(fpint32_t num, fpint32_t denum);
```

```cpp
// hmmm https://www.youtube.com/watch?v=S12qx1DwjVk& at ~ 18:00 
float fp_fixedToFloat(fpint32_t fixed){
  return ((float)fixed / (float)(1 << fp_scale));
}

// actually this is unclear to me... https://www.youtube.com/watch?v=S12qx1DwjVk& at 16:57
fpint32_t fp_floatToFixed(float flt){
  return (flt * (float)(1 << fp_scale));
}

int32_t fp_fixedToInt(fpint32_t fixed){
  return (fixed >> fp_scale);
}

fpint32_t fp_intToFixed(int32_t inty){
  return (inty << fp_scale); 
}

// w/ fixed point mult, we have some out-of-ranging trouble, 
// we can maybe do this w/ 64-bit ints, but it's going to suck a little bit of time
// though still better than the floating point libs, 
fp_int32_t fp_mult(fpint32_t a, fpint32_t b){
  return ((int64_t)(a) * (int64_t)(b)) >> fp_scale;
}
// we can instead do it w/ some fancy shifting, but I'm not going to get into this yet: 
// leaving it as a potential speedup... 
// https://www.youtube.com/watch?v=npQF28g6s_k& 7:40 
// fp_int32_t fp_mult(fpint32_t a, fpint32_t b){
//   return ((a >> 6) * (b >> 6)) >> 4;
// }

// division...
fpint32_t fp_div(fpint32_t num, fpint32_t denum){
  return ((int64_t)(num) << fp_scale) / denum;
}
```

So I can more or less dead-nuts replace the current integrator with these maths, then see if I can get similar results as what I had previously. 

## 2022 12 15 

Alrigh I've this loaded and running and, yeah, integrator runs now around 4us relative the previous ~ 50... looks like I would be OK running the integrator up to 10KHz, maybe 20? But does it still work... Hmm - more like 4us when everything is inactive, 10-20us when it's chugging along actually doing maths. 

I think the crux of the manner in which this is currently set up is that there's a big dynamic range between the ~ position, velocity values, and the delta-T, which is very small (0.0001 here, w/ 100us time). 

Better would be to store speeds, etc, in delta-T base time? But we then also invite a suspiciously large amount of converting-in-and-out fkery. 

I think I'm going to carry on w/ this, then think about adding precision later on... first, will try to add the dead-reckoning integration steps. 

---

## Perf Goals

- from 50us integration step, 250us integration period 
  - to 5us step, 50us period 