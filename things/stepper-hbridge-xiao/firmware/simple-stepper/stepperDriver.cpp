/*
stepperDriver.cpp

stepper code for two A4950s or TB67... w/ VREF via TC -> RC Filters 
for the RP2040 XIAO ! 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the squidworks and ponyo
projects. Copyright is retained and must be preserved. The work is provided as
is; no warranty is provided, and users accept all liability.
*/

#include "stepperDriver.h"
#include "stepperLUT.h"

#define AIN1_PIN 6
#define AIN2_PIN 7
#define BIN1_PIN 28
#define BIN2_PIN 4
#define APWM_PIN 27
#define BPWM_PIN 29

#define APWM_BM (uint32_t)(1 << APWM_PIN)
#define BPWM_BM (uint32_t)(1 << BPWM_PIN) 

#define AIN1_BM (uint32_t)(1 << AIN1_PIN)
#define AIN2_BM (uint32_t)(1 << AIN2_PIN)
#define BIN1_BM (uint32_t)(1 << BIN1_PIN)
#define BIN2_BM (uint32_t)(1 << BIN2_PIN)

#define AIN1_HI sio_hw->gpio_set = AIN1_BM
#define AIN1_LO sio_hw->gpio_clr = AIN1_BM
#define AIN2_HI sio_hw->gpio_set = AIN2_BM
#define AIN2_LO sio_hw->gpio_clr = AIN2_BM
#define BIN1_HI sio_hw->gpio_set = BIN1_BM
#define BIN1_LO sio_hw->gpio_clr = BIN1_BM
#define BIN2_HI sio_hw->gpio_set = BIN2_BM
#define BIN2_LO sio_hw->gpio_clr = BIN2_BM

// set a phase up or down direction
// transition low first, avoid brake condition for however many ns 
#define A_UP AIN2_LO; AIN1_HI
#define A_OFF AIN2_LO; AIN1_LO
#define A_DOWN AIN1_LO; AIN2_HI
#define B_UP BIN2_LO; BIN1_HI 
#define B_OFF BIN2_LO; BIN1_LO
#define B_DOWN BIN1_LO; BIN2_HI

uint16_t sliceNumA;
uint16_t sliceNumB;
uint16_t channelA;
uint16_t channelB;

// one electrical phase is 1024 steps through our LUT, 
// coils are 90', so 256 ticks out of phase with one another:
volatile uint16_t lutPtrA = 256;
volatile uint16_t lutPtrB = 0;

// LUT, 0-1022, 64 entries, sin w/ 511 at midpoint 
// full sweep of electrical phase is actually 4 'steps' - 
// so making a full step means incrementing 16 times through this LUT, 
// half step is 8, quarter step 4, eighth step 2, sixteenth microstepping is one, fin 
// const uint16_t LUT_1022[64] = {
//     511,561,611,659,707,752,795,835,872,906,936,962,983,1000,1012,1020,
//     1022,1020,1012,1000,983,962,936,906,872,835,795,752,707,659,611,561,
//     511,461,411,363,315,270,227,187,150,116,86,60,39,22,10,2,
//     0,2,10,22,39,60,86,116,150,187,227,270,315,363,411,461,
// };
// on init / cscale, we write new values into this thing, which is where
// we actually pull currents from, for the h-bridges 
// uint16_t LUT_CURRENTS[64];
// one electrical phase is 64 pts, so stick us 90' out of phase from one another... 
// volatile uint8_t lutPtrA = 16;
// volatile uint8_t lutPtrB = 0;

void stepper_init(void){
  // -------------------------------------------- DIR PINS 
  // all of 'em, outputs 
  pinMode(AIN1_PIN, OUTPUT);
  pinMode(AIN2_PIN, OUTPUT);
  pinMode(BIN1_PIN, OUTPUT);
  pinMode(BIN2_PIN, OUTPUT);

  gpio_set_function(APWM_PIN, GPIO_FUNC_PWM);
  gpio_set_function(BPWM_PIN, GPIO_FUNC_PWM);
  sliceNumA = pwm_gpio_to_slice_num(APWM_PIN);
  sliceNumB = pwm_gpio_to_slice_num(BPWM_PIN);
  channelA = pwm_gpio_to_channel(APWM_PIN);
  channelB = pwm_gpio_to_channel(BPWM_PIN);

  // we set the clock such that the PWM period is 100kHz, 
  // which is plenty fast for our RC filter
  // TODO: faster clocks seem to overflow the counter ? 
  // what's the limit on /divider ? 
  // or fk it, go full beans always ? 
  // uint32_t f_sys = clock_get_hz(clk_sys);
  float divider = 1.0F; //(float)f_sys / (PWM_PERIOD * 10000UL);  

  pwm_set_clkdiv(sliceNumA, divider);
  pwm_set_clkdiv(sliceNumB, divider);

  // pwm period
  pwm_set_wrap(sliceNumA, PWM_PERIOD);
  pwm_set_wrap(sliceNumB, PWM_PERIOD);

  // set a start-up value of 1 / PWM_PERIOD 
  pwm_set_chan_level(sliceNumA, channelA, 1);
  pwm_set_chan_level(sliceNumB, channelB, 1);

  // Set the PWM running
  pwm_set_enabled(sliceNumA, true);
  pwm_set_enabled(sliceNumB, true);

  // we actually recalculate a LUT of currents when we reset this value...
  // stepper_setCScale(0.05F);  // it's 0-1, innit 
}

// ideally it would be uint16_t amplitude, 0-1024 also... implicit fixed-point, 
// TODO: are currently ignoring the amplitude 
void stepper_point(uint16_t phaseAngle, float amplitude){
  // wrap phaseAngle to 2048, and get a / b components 
  uint16_t coilAPhase = phaseAngle & 0b0000011111111111;
  uint16_t coilBPhase = (phaseAngle + LUT_LENGTH / 2) & 0b0000011111111111;

  // clamp amplitude, 
  if(amplitude < 0.0F) amplitude = 0.0F;
  if(amplitude > 1.0F) amplitude = 1.0F;

  // a coil dir 
  if (coilAPhase > LUT_LENGTH){
    A_DOWN;
  } else if (coilAPhase < LUT_LENGTH){
    A_UP;
  } else {
    A_OFF;
  }
  // b coil dir 
  if (coilBPhase > LUT_LENGTH){
    B_DOWN;
  } else if (coilBPhase < LUT_LENGTH){
    B_UP;
  } else {
    B_OFF;
  }

  // now we rectify each to the positive half wave
  uint16_t coilAMag = coilAPhase & 0b0000001111111111;
  uint16_t coilBMag = coilBPhase & 0b0000001111111111;

  // and set amplitudes...
  pwm_set_chan_level(sliceNumA, channelA, LUT[coilAMag]);
  pwm_set_chan_level(sliceNumB, channelB, LUT[coilBMag]);
}

// void stepper_publishCurrents(void){
//   // position in LUT
//   // depending on sign of phase, set up / down on gates 
//   if(LUT_1022[lutPtrA] > 511){
//     A_UP;
//   } else if (LUT_1022[lutPtrA] < 511){
//     A_DOWN;
//   } else {
//     A_OFF;
//   }
//   if(LUT_1022[lutPtrB] > 511){
//     B_UP;
//   } else if (LUT_1022[lutPtrB] < 511){
//     B_DOWN;
//   } else {
//     B_OFF;
//   }
//   pwm_set_chan_level(sliceNumA, channelA, LUT_CURRENTS[lutPtrA] >> 3);
//   pwm_set_chan_level(sliceNumB, channelB, LUT_CURRENTS[lutPtrB] >> 3);
// }

// void stepper_step(uint8_t microSteps, boolean dir){
//   // step LUT ptrs thru table, increment and wrap w/ bit logic 
//   if(dir){
//     lutPtrA += microSteps; lutPtrA = lutPtrA & 0b00111111;
//     lutPtrB += microSteps; lutPtrB = lutPtrB & 0b00111111;
//   } else {
//     lutPtrA -= microSteps; lutPtrA = lutPtrA & 0b00111111;
//     lutPtrB -= microSteps; lutPtrB = lutPtrB & 0b00111111;
//   }
//   stepper_publishCurrents();
// }

// void stepper_setCScale(float scale){
//   // scale max 1.0, min 0.0,
//   if(scale > 1.0F) scale = 1.0F;
//   if(scale < 0.0F) scale = 0.0F;
//   // for each item in the LUTs,
//   for(uint8_t i = 0; i < 64; i ++){
//     if(LUT_1022[i] > 511){
//       // top half, no invert, but shift-down and scale 
//       LUT_CURRENTS[i] = (LUT_1022[i] - 511) * 2.0F * scale;
//     } else if (LUT_1022[i] < 511){
//       // lower half, invert and shift down 
//       float temp = LUT_1022[i];   // get lut as float, 
//       temp = (temp * -2.0F + 1022) * scale; // scale (flipping) and offset back up 
//       LUT_CURRENTS[i] = temp; // set table element, 
//     } else {
//       // the midpoint: off, 
//       LUT_CURRENTS[i] = 0;
//     }
//   }
//   // re-publish currents,
//   stepper_publishCurrents();
// }
