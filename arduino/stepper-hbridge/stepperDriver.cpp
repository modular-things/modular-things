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

#define AIN1_PIN 17
#define AIN1_PORT PORT->Group[0]
#define AIN1_BM (uint32_t)(1 << AIN1_PIN)
#define AIN2_PIN 19
#define AIN2_PORT PORT->Group[0]
#define AIN2_BM (uint32_t)(1 << AIN2_PIN)
#define BIN1_PIN 9
#define BIN1_PORT PORT->Group[0]
#define BIN1_BM (uint32_t)(1 << BIN1_PIN)
#define BIN2_PIN 10
#define BIN2_PORT PORT->Group[0] 
#define BIN2_BM (uint32_t)(1 << BIN2_PIN)

#define AIN1_HI AIN1_PORT.OUTSET.reg = AIN1_BM
#define AIN1_LO AIN1_PORT.OUTCLR.reg = AIN1_BM
#define AIN2_HI AIN2_PORT.OUTSET.reg = AIN2_BM
#define AIN2_LO AIN2_PORT.OUTCLR.reg = AIN2_BM 
#define BIN1_HI BIN1_PORT.OUTSET.reg = BIN1_BM
#define BIN1_LO BIN1_PORT.OUTCLR.reg = BIN1_BM
#define BIN2_HI BIN2_PORT.OUTSET.reg = BIN2_BM
#define BIN2_LO BIN2_PORT.OUTCLR.reg = BIN2_BM

// set a phase up or down direction
// transition low first, avoid brake condition for however many ns 
#define A_UP AIN2_LO; AIN1_HI
#define A_OFF AIN2_LO; AIN1_LO
#define A_DOWN AIN1_LO; AIN2_HI
#define B_UP BIN2_LO; BIN1_HI 
#define B_OFF BIN2_LO; BIN1_LO
#define B_DOWN BIN1_LO; BIN2_HI

// on TCC0-6 (F) or TCC2-0 (E)
#define APWM_PIN 16
#define APWM_PORT PORT->Group[0] 
#define APWM_BM (uint32_t)(1 << APWM_PIN)

// on TCC0-0 (E)
#define BPWM_PIN 8
#define BPWM_PORT PORT->Group[0] 
#define BPWM_BM (uint32_t)(1 << BPWM_PIN) 

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

void stepper_init(void){
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
  // -------------------------------------------- APWM TCC 
  // setup TCC0-6 / PA16
  // set pin as output, 
  APWM_PORT.DIRSET.reg = APWM_BM;
  // mux pins, both onto TCC0 peripheral, 
  APWM_PORT.PINCFG[APWM_PIN].reg |= PORT_PINCFG_PMUXEN;
  APWM_PORT.PMUX[APWM_PIN >> 1].reg = PORT_PMUX_PMUXE_E; // TODO check this, and below, for proper ch, 
  BPWM_PORT.PINCFG[BPWM_PIN].reg |= PORT_PINCFG_PMUXEN;
  BPWM_PORT.PMUX[BPWM_PIN >> 1].reg = PORT_PMUX_PMUXE_E;
  // TCC0 settings, for BPWM
  TCC0->CTRLA.reg |= TCC_CTRLA_PRESCALER_DIV1; 
  TCC0->WAVE.reg = TCC_WAVE_WAVEGEN_NPWM;
  while(TCC0->SYNCBUSY.bit.WAVE);
  TCC0->PER.reg = 128; 
  while(TCC0->SYNCBUSY.bit.PER);
  TCC0->CCB[0].reg = 15;  // BPWM 
  TCC0->CTRLA.bit.ENABLE = 1;
  // TCC2 settings, for APWM
  TCC2->CTRLA.reg |= TCC_CTRLA_PRESCALER_DIV1; 
  TCC2->WAVE.reg = TCC_WAVE_WAVEGEN_NPWM;
  while(TCC2->SYNCBUSY.bit.WAVE);
  TCC2->PER.reg = 128; 
  while(TCC2->SYNCBUSY.bit.PER);
  // TCC0->CC[6].reg = 15;  // APWM
  TCC2->CCB[0].reg = 15;  // BPWM 
  TCC2->CTRLA.bit.ENABLE = 1;
  // -------------------------------------------- 
}

void stepper_step(uint8_t microSteps, boolean dir){
  
}

void stepper_setCScale(float scale){

}
