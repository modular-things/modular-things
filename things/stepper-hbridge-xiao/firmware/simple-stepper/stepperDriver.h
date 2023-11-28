/*
stepperDriver.h

stepper code for two A4950s w/ VREF via TC -> RC Filters
with RP2040 support

Jake Read & Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the squidworks and ponyo
projects. Copyright is retained and must be preserved. The work is provided as
is; no warranty is provided, and users accept all liability.
*/

#ifndef STEPPER_DRIVER_H_
#define STEPPER_DRIVER_H_

#include <Arduino.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"

// startup stepper hardware 
void stepper_init(void);

// mapping 0-2PI is 0-2048 and 0-1 is 0-1024 
void stepper_point(uint16_t phaseAngle, uint16_t amplitude);

// or, omitting amplitude... 
void stepper_point(uint16_t phaseAngle);

void stepper_setAmplitude(uint16_t amplitude);

#endif 
