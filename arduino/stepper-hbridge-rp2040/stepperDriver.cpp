/*
stepperDriver.cpp

stepper code for two A4950s w/ VREF via TC -> RC Filters 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the squidworks and ponyo
projects. Copyright is retained and must be preserved. The work is provided as
is; no warranty is provided, and users accept all liability.
*/

#include "stepperDriver.h"

#define RPSTEPPER_IS_NEWSHIT

// AFAIK this is using "GPIO nums" on the RP2040... 

#ifdef RPSTEPPER_IS_NEWSHIT

#define AIN1_PIN 6
#define AIN2_PIN 7
#define BIN1_PIN 28
#define BIN2_PIN 4
#define APWM_PIN 27
#define BPWM_PIN 29

#else 

// #define AIN1_PIN 0
// #define AIN2_PIN 7
// #define BIN1_PIN 2
// #define BIN2_PIN 4
// #define APWM_PIN 6
// #define BPWM_PIN 1

#endif 

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

uint16_t slice_num_a;
uint16_t slice_num_b;
uint16_t channel_a;
uint16_t channel_b;

// LUT, 0-1022, 64 entries, sin w/ 511 at midpoint 
// full sweep of electrical phase is actually 4 'steps' - 
// so making a full step means incrementing 16 times through this LUT, 
// half step is 8, quarter step 4, eighth step 2, sixteenth microstepping is one, fin 
const uint16_t LUT_1022[64] = {
    511,561,611,659,707,752,795,835,872,906,936,962,983,1000,1012,1020,
    1022,1020,1012,1000,983,962,936,906,872,835,795,752,707,659,611,561,
    511,461,411,363,315,270,227,187,150,116,86,60,39,22,10,2,
    0,2,10,22,39,60,86,116,150,187,227,270,315,363,411,461,
};
// on init / cscale, we write new values into this thing, which is where
// we actually pull currents from, for the h-bridges 
uint16_t LUT_CURRENTS[64];
// one electrical phase is 64 pts, so stick us 90' out of phase from one another... 
volatile uint8_t lutPtrA = 16;
volatile uint8_t lutPtrB = 0;

void stepper_init(void){
  // -------------------------------------------- DIR PINS 
  // all of 'em, outputs 
  pinMode(AIN1_PIN, OUTPUT);
  pinMode(AIN2_PIN, OUTPUT);
  pinMode(BIN1_PIN, OUTPUT);
  pinMode(BIN2_PIN, OUTPUT);

  gpio_set_function(APWM_PIN, GPIO_FUNC_PWM);
  gpio_set_function(BPWM_PIN, GPIO_FUNC_PWM);
  slice_num_a = pwm_gpio_to_slice_num(APWM_PIN);
  slice_num_b = pwm_gpio_to_slice_num(BPWM_PIN);
  channel_a = pwm_gpio_to_channel(APWM_PIN);
  channel_b = pwm_gpio_to_channel(BPWM_PIN);

  uint32_t f_sys = clock_get_hz(clk_sys);
  float divider = (float)f_sys / (128*375000UL);  // pwm clock at 375kHz

  pwm_set_clkdiv(slice_num_a, divider);
  pwm_set_clkdiv(slice_num_b, divider);

  // pwm period
  pwm_set_wrap(slice_num_a, 127);
  pwm_set_wrap(slice_num_b, 127);

  // PWM duty cycle over 128
  pwm_set_chan_level(slice_num_a, channel_a, 15);
  pwm_set_chan_level(slice_num_b, channel_b, 15);

  // Set the PWM running
  pwm_set_enabled(slice_num_a, true);
  pwm_set_enabled(slice_num_b, true);

  // -------------------------------------------- we actually recalculate a LUT of currents when we reset this value...
  stepper_setCScale(0.05F);  // it's 0-1, innit 
}

void stepper_publishCurrents(void){
  // position in LUT
  pwm_set_chan_level(slice_num_a, channel_a, LUT_CURRENTS[lutPtrA] >> 3);
  pwm_set_chan_level(slice_num_b, channel_b, LUT_CURRENTS[lutPtrB] >> 3);
}

void stepper_step(uint8_t microSteps, boolean dir){
  // step LUT ptrs thru table, increment and wrap w/ bit logic 
  if(dir){
    lutPtrA += microSteps; lutPtrA = lutPtrA & 0b00111111;
    lutPtrB += microSteps; lutPtrB = lutPtrB & 0b00111111;
  } else {
    lutPtrA -= microSteps; lutPtrA = lutPtrA & 0b00111111;
    lutPtrB -= microSteps; lutPtrB = lutPtrB & 0b00111111;
  }
  // depending on sign of phase, set up / down on gates 
  if(LUT_1022[lutPtrA] > 511){
    A_UP;
  } else if (LUT_1022[lutPtrA] < 511){
    A_DOWN;
  } else {
    A_OFF;
  }
  if(LUT_1022[lutPtrB] > 511){
    B_UP;
  } else if (LUT_1022[lutPtrB] < 511){
    B_DOWN;
  } else {
    B_OFF;
  }
  stepper_publishCurrents();
}

void stepper_setCScale(float scale){
  // scale max 1.0, min 0.0,
  if(scale > 1.0F) scale = 1.0F;
  if(scale < 0.0F) scale = 0.0F;
  // for each item in the LUTs,
  for(uint8_t i = 0; i < 64; i ++){
    if(LUT_1022[i] > 511){
      // top half, no invert, but shift-down and scale 
      LUT_CURRENTS[i] = (LUT_1022[i] - 511) * 2.0F * scale;
    } else if (LUT_1022[i] < 511){
      // lower half, invert and shift down 
      float temp = LUT_1022[i];   // get lut as float, 
      temp = (temp * -2.0F + 1022) * scale; // scale (flipping) and offset back up 
      LUT_CURRENTS[i] = temp; // set table element, 
    } else {
      // the midpoint: off, 
      LUT_CURRENTS[i] = 0;
    }
  }
  // re-publish currents,
  stepper_publishCurrents();
}
