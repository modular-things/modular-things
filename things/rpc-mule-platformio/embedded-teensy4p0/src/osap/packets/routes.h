/*
osap/routes.h

directions

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2021

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the osap project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

#ifndef OSAP_ROUTES_H_
#define OSAP_ROUTES_H_

#include <Arduino.h>
#include "../osap_config.h"

// a route type...
class Route {
  public:
    // the actual underlying path, with PK_PTR in [0]
    uint8_t encodedPath[OSAP_CONFIG_ROUTE_MAX_LENGTH];
    // the size of the path, 
    uint16_t encodedPathLen = 0;
    // per-hop time to live: ms until timeout in a given runtime 
    uint16_t perHopTimeToLive = 2000;
    // given memory constraints, transmitters need to know how 
    // much data can be packed in a given route, as do rx'ers
    // who are liable to flip a route and reply to something, 
    // this is that size 
    uint16_t maxSegmentSize = OSAP_CONFIG_PACKET_MAX_SIZE;

    // write-direct constructor,
    Route(uint8_t* _encodedPath, uint16_t _encodedPathLen, uint16_t _perHopTimeToLive, uint16_t _maxSegmentSize);

    // reverse the route in-place
    void reverse(void);

    // pass-thru initialize constructors;
    Route(void);

    // write a link-forwarding instruction into the route 
    Route* linkf(uint16_t txIndex);
    // append a bus-forwarding instruction to the route 
    Route* busf(uint16_t txIndex, uint16_t txAddress);
    // finish the route ?
    Route* end(uint16_t perHopTimeToLive = 2000, uint16_t maxSegmentSize = OSAP_CONFIG_PACKET_MAX_SIZE);
};

#endif
