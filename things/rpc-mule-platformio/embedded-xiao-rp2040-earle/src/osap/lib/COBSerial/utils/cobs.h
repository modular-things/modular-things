/*
utils/cobs.h

consistent overhead byte stuffing implementation

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2019

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the osap project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

#ifndef UTIL_COBS_H_
#define UTIL_COBS_H_

#include <Arduino.h>

size_t cobsEncode(const void *data, size_t length, uint8_t *buffer);

size_t cobsDecode(const uint8_t *buffer, size_t length, void *data);

#endif
