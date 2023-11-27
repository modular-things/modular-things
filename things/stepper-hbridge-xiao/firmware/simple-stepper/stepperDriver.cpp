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

#define AIN1_PIN 6      // on D4
#define AIN2_PIN 7      // on D5 
#define BIN1_PIN 28     // on D2
#define BIN2_PIN 4      // on D9 
#define APWM_PIN 27     // on D1
#define BPWM_PIN 29     // on D3 

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

  // TODO: check about the old code, with Q ? 
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
}

// mapping 0-2PI is 0-2048 and 0-1 is 0-1024 
void stepper_point(uint16_t phaseAngle, uint16_t amplitude){
  // wrap phaseAngle to 2048, and get a / b components 
  uint16_t coilAPhase = phaseAngle                    & 0b0000011111111111;
  uint16_t coilBPhase = (phaseAngle + LUT_LENGTH / 2) & 0b0000011111111111;

  // clamp amplitude, 
  amplitude = amplitude & 0b0000001111111111;

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

  // now we rectify each to the positive half wave, 
  coilAPhase = coilAPhase & 0b0000001111111111;
  coilBPhase = coilBPhase & 0b0000001111111111;

  // expand to 32 for multiply overflow, 
  // then do fixed-point where 0-1.0 == 0-1024, using 2^10 bit divide 
  uint32_t coilAMag = (LUT[coilAPhase] * amplitude) >> 10;
  uint32_t coilBMag = (LUT[coilBPhase] * amplitude) >> 10;

  // and set amplitudes...
  pwm_set_chan_level(sliceNumA, channelA, coilAMag);
  pwm_set_chan_level(sliceNumB, channelB, coilBMag);
}
