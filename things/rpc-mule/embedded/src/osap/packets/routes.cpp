/*
osap/routes.cpp

directions

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2021

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the osap project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

#include "routes.h"
#include "../utils/keys.h"
#include "../utils/serializers.h"
#include "../utils/debug.h"

// these two includes only required for the debug... 
// #include "../utils/debug.h"

// direct constructor, 
Route::Route(uint8_t* _encodedPath, uint16_t _encodedPathLen, uint16_t _perHopTimeToLive, uint16_t _maxSegmentSize){
// guard, should do better to stash / report errors, idk 
  if(_encodedPathLen > 64){
    _encodedPathLen = 64;
  }
  // copy-in 
  perHopTimeToLive = _perHopTimeToLive;
  maxSegmentSize = _maxSegmentSize;
  encodedPathLen = _encodedPathLen;
  // memcpy-in 
  memcpy(encodedPath, _encodedPath, encodedPathLen);
}

// empty constructor for chaining, 
Route::Route(void){}

Route* Route::linkf(uint16_t txIndex){
  encodedPath[encodedPathLen ++] = TKEY_LINKF;
  serializers_writeUint16(encodedPath, &encodedPathLen, txIndex);
  return this;
}

Route* Route::busf(uint16_t txIndex, uint16_t txAddress){
  encodedPath[encodedPathLen ++] = TKEY_LINKF;
  serializers_writeUint16(encodedPath, &encodedPathLen, txIndex);
  serializers_writeUint16(encodedPath, &encodedPathLen, txAddress);
  return this;
}

Route* Route::end(uint16_t _perHopTimeToLive, uint16_t _maxSegmentSize){
  perHopTimeToLive = _perHopTimeToLive;
  maxSegmentSize = _maxSegmentSize;
  return this;
}

// TODO: it seems like (?) we could shave this chunk of RAM 
// by using some other temporary buffer, like the Port::payload or Port::datagram 
// but would need to analyze whether / not those are likely to be mid-write 
// when this is called (which actually seems fairly likely) 
uint8_t oldPathStash[OSAP_CONFIG_ROUTE_MAX_LENGTH];

uint8_t getKeyIncrement(uint8_t key){
  switch(key){
    case TKEY_LINKF:
      return 3;
    case TKEY_PORTPACK:
    case TKEY_BUSF:
      return 5;
    default:
      // everything else is bunko 
      // but if we return... something, we won't hang-up 
      // the while() loops that call this ute... 
      OSAP_ERROR("bad key_getIncrement value " + String(key));
      return 3;
  }
}

void Route::reverse(void){
  // pull a copy of the path out, 
  memcpy(oldPathStash, encodedPath, encodedPathLen);
  // reading from 1st-key in old, writing from back-to-front into new, 
  uint16_t rptr = 0;
  uint16_t wptr = encodedPathLen; 
  while(wptr > 0){
    uint8_t increment = getKeyIncrement(oldPathStash[rptr]);
    wptr -= increment;
    for(uint8_t i = 0; i < increment; i ++){
      encodedPath[wptr + i] = oldPathStash[rptr + i];
    }
    rptr += increment;
  }
}