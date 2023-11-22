/*
thwapperDriver.cpp

thwapper code for two A4950s w/ VREF via TC -> RC Filters 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the squidworks and ponyo
projects. Copyright is retained and must be preserved. The work is provided as
is; no warranty is provided, and users accept all liability.
*/

#include "thwapperDriver.h"

// h-bridge pins, rendered per actual D21 GPIO 

/*
PIN   | XIAO  | XIAO:D21  | D21 TC    |
--------------------------|
APWM  | 2     | PA04      | TCC0:0(E) |
AIN1  | 5     | PA08      |
AIN2  | 6     | PA09      |
BPWM  | 4     | PA11      | TCC0:3(F) |
BIN1  | 3     | PA10      |
BIN2  | 10    | PA05      |
*/

#define APWM_PIN 4
#define AIN1_PIN 8
#define AIN2_PIN 9
#define BPWM_PIN 11
#define BIN1_PIN 10
#define BIN2_PIN 5

// pin masks / ports / fundamental ops 

#define AIN1_PORT PORT->Group[0]
#define AIN2_PORT PORT->Group[0]
#define BIN1_PORT PORT->Group[0]
#define BIN2_PORT PORT->Group[0] 
#define AIN1_BM (uint32_t)(1 << AIN1_PIN)
#define AIN2_BM (uint32_t)(1 << AIN2_PIN)
#define BIN1_BM (uint32_t)(1 << BIN1_PIN)
#define BIN2_BM (uint32_t)(1 << BIN2_PIN)
// on TCC0-6 (F) or TCC2-0 (E)
#define APWM_PORT PORT->Group[0] 
#define APWM_BM (uint32_t)(1 << APWM_PIN)
// on TCC0-0 (E)
#define BPWM_PORT PORT->Group[0] 
#define BPWM_BM (uint32_t)(1 << BPWM_PIN) 

#define AIN1_HI AIN1_PORT.OUTSET.reg = AIN1_BM
#define AIN1_LO AIN1_PORT.OUTCLR.reg = AIN1_BM
#define AIN2_HI AIN2_PORT.OUTSET.reg = AIN2_BM
#define AIN2_LO AIN2_PORT.OUTCLR.reg = AIN2_BM 
#define BIN1_HI BIN1_PORT.OUTSET.reg = BIN1_BM
#define BIN1_LO BIN1_PORT.OUTCLR.reg = BIN1_BM
#define BIN2_HI BIN2_PORT.OUTSET.reg = BIN2_BM
#define BIN2_LO BIN2_PORT.OUTCLR.reg = BIN2_BM

// h-bridge atomic ops: a/b channels up/down/off (fast decay) 

#define A_UP AIN2_LO; AIN1_HI
#define A_OFF AIN2_LO; AIN1_LO
#define A_DOWN AIN1_LO; AIN2_HI
#define B_UP BIN2_LO; BIN1_HI 
#define B_OFF BIN2_LO; BIN1_LO
#define B_DOWN BIN1_LO; BIN2_HI

void thwapper_begin(void){
  // -------------------------------------------- DIR PINS 
  // all of 'em, outputs 
  AIN1_PORT.DIRSET.reg = AIN1_BM;
  AIN2_PORT.DIRSET.reg = AIN2_BM;
  BIN1_PORT.DIRSET.reg = BIN1_BM;
  BIN2_PORT.DIRSET.reg = BIN2_BM;
  // -------------------------------------------- TCC SETUPS 
  // s/o https://blog.thea.codes/phase-shifted-pwm-on-samd/ 
  // unmask the peripheral, 
  PM->APBCMASK.reg |= PM_APBCMASK_TCC0 | PM_APBCMASK_TCC1 | PM_APBCMASK_TCC2;
  // make a clock w/ DFLL48 src on ch4;
  GCLK->GENCTRL.reg = GCLK_GENCTRL_ID(4)|
                      GCLK_GENCTRL_GENEN |
                      GCLK_GENCTRL_SRC_DFLL48M |
                      GCLK_GENCTRL_IDC;
  while(GCLK->STATUS.bit.SYNCBUSY);
  // route this clk (on 4) to our peripheral 
  GCLK->CLKCTRL.reg = GCLK_CLKCTRL_CLKEN |       // enable a clock, 
                      GCLK_CLKCTRL_GEN_GCLK4 |   // select 
                      GCLK_CLKCTRL_ID_TCC0_TCC1; // route to TCC0 / TCC1 
  while(GCLK->STATUS.bit.SYNCBUSY);
    // route this clk (on 4) to our peripheral 
  GCLK->CLKCTRL.reg = GCLK_CLKCTRL_CLKEN |       // enable a clock, 
                      GCLK_CLKCTRL_GEN_GCLK4 |   // select 
                      GCLK_CLKCTRL_ID_TCC2_TC3; // route to TCC0 / TCC1 
  while(GCLK->STATUS.bit.SYNCBUSY);
  // -------------------------------------------- PWM Generating TCC's
  /*
  APWM  | 2     | PA04      | TCC0:0(E) |
  BPWM  | 4     | PA11      | TCC0:3(F) |
  */
  // set pin as output, 
  APWM_PORT.DIRSET.reg = APWM_BM;
  // mux APWM (PA04: even) onto E peripheral 
  APWM_PORT.PINCFG[APWM_PIN].reg |= PORT_PINCFG_PMUXEN;
  APWM_PORT.PMUX[APWM_PIN >> 1].reg = PORT_PMUX_PMUXE_E; 
  // mux BPWM (PA11: odd) onto F peripheral 
  BPWM_PORT.PINCFG[BPWM_PIN].reg |= PORT_PINCFG_PMUXEN;
  BPWM_PORT.PMUX[BPWM_PIN >> 1].reg = PORT_PMUX_PMUXO_F;
  // TCC0 settings
  TCC0->CTRLA.reg |= TCC_CTRLA_PRESCALER_DIV1; 
  TCC0->WAVE.reg = TCC_WAVE_WAVEGEN_NPWM;
  while(TCC0->SYNCBUSY.bit.WAVE);
  TCC0->PER.reg = 256; 
  while(TCC0->SYNCBUSY.bit.PER);
  TCC0->CCB[0].reg = 0;   // APWM init w/ no juice 
  TCC0->CCB[3].reg = 0;   // BPWM ||
  TCC0->CTRLA.bit.ENABLE = 1;
}

// current [-255:255] 
void thwapper_a_write_current(int16_t current){
  if(current > 0){
    if(current > 255) current = 255;
    A_UP;
    TCC0->CCB[0].reg = current;
  } else if (current < 0){
    if(current < -255) current = -255;
    A_DOWN;
    TCC0->CCB[0].reg = current;
  } else {
    A_OFF;
    TCC0->CCB[0].reg = 0;
  }
}

// current [-255:255]
void thwapper_b_write_current(int16_t current){
  if(current > 0){
    if(current > 255) current = 255;
    B_UP;
    TCC0->CCB[3].reg = current;
  } else if (current < 0){
    if(current < -255) current = -255;
    B_DOWN;
    TCC0->CCB[3].reg = current;
  } else {
    B_OFF;
    TCC0->CCB[3].reg = 0;
  }
}

// some stateful thwap tracking,

uint32_t strike_time_ms = 50;
uint32_t strike_start_a = 0;
boolean strike_ongoing_a = false;

// use velocity is current, strike timing always the same... 
void thwapper_a_strike(uint8_t velocity){
  thwapper_a_write_current(velocity);
  strike_start_a = millis();
  strike_ongoing_a = true;
}

// loop to update sinusoids out or async cancel thwaps... 
void thwapper_loop(void){
  if(strike_ongoing_a){
    if(strike_start_a + strike_time_ms < millis()){
      strike_ongoing_a = false; 
      thwapper_a_write_current(0);
    }
  }
}