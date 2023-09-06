/*
stepperDriver.h

stepper code for two A4950s w/ VREF via TC -> RC Filters 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the squidworks and ponyo
projects. Copyright is retained and must be preserved. The work is provided as
is; no warranty is provided, and users accept all liability.
*/

#ifndef STEPPER_DRIVER_H_
#define STEPPER_DRIVER_H_

#include <Arduino.h>

void thwapper_begin(void);
void thwapper_loop(void);

// this'll be more or less built for MIDI type messages
void thwapper_a_strike(uint8_t velocity);

#endif 
