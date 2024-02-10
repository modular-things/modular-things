/*
osap/packets.h

reading and writing from packet buffers in the transport layer 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2021

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the osap project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

#ifndef OSAP_PACKETS_H_
#define OSAP_PACKETS_H_

#include <Arduino.h>
#include "routes.h"
#include "../structure/ports.h"
#include "../structure/links.h"

// ---------------------------------------------- The Packet Structure 

// the vpacket structure is where we stash messages as they make their 
// way through the transvport / routing layer, 
typedef struct VPacket {
  // the packet's underlying buffer 
  uint8_t data[OSAP_CONFIG_PACKET_MAX_SIZE];
  // the underlying buffer's current size 
  size_t len = 0;
  // given the packet's `perHopTimeToLive`, we can calculate a deadline
  // for the packet: if the current time is beyond this, we can time it out 
  uint32_t serviceDeadline = 0;

  // packets also stash info w/r/t their whereabouts in the stack and in the system 
  // this is the vport where the packet is currently allocated
  // when vport == nullptr, the packet is unallocated 
  VPort* vport = nullptr;
  LGateway* lgateway = nullptr;

  // won't need this source until runtime can perform scope-checks, 
  // Runtime* runtime = nullptr; 

  // next packet in the linked ringbuffer
  VPacket* next = nullptr;
  // previous packet in the ringbuffer 
  VPacket* previous = nullptr;
} VPacket;

// - packets.h should be the main interface to packet-handling, 
// - `pck* = getPacketFromStack(this)` to see if we can allocate one to write into, 
//   - overload for runtime, link, port... simple enough 
// - `relinquishPacketToStack(pck*)` to free it up 
// - `stuffPacket(pck*, route*, data*)` for transport-layer work, 
// - `stuffPacket(pck*, route*, sourcePort, destPort)` for port-to-port work... 

// ---------------------------------------------- Stack Utils 

// reset the stack at startup (note: a list of vpackets, not a single vpacket)
void stackReset(VPacket* stack, size_t stackSize);

// api for the runtime to collect a list 
size_t stackGetPacketsToService(VPacket** packets, size_t maxPackets);

// ---------------------------------------------- Get / Relinquish Packets from / to the Stack 

// these are overloaded for various packet-accessors 
VPacket* getPacketFromStack(VPort* vport);
VPacket* getPacketFromStack(LGateway* lgateway);

// vports .clearToSend() requires that they check w/o actually allocating
boolean getPacketCheck(VPort* vport);
boolean getPacketCheck(LGateway* lgateway);

// giving it up, 
void relinquishPacketToStack(VPacket* pck);

// ---------------------------------------------- Route Retrieval 

// copies route data from a packet into a (provided) route object 
void getRouteFromPacket(VPacket* pck, Route* route);

// ---------------------------------------------- Packet Stuffing 

// stuffing into allocated packet, 
void stuffPacketRaw(VPacket* pck, Route* route, uint8_t* data, size_t len);

// stuffing from:to port,
void stuffPacketPortToPort(VPacket* pck, Route* route, uint16_t sourcePort, uint16_t destinationPort, uint8_t* data, size_t len);

// stuff a packet with a route & data, 
// size_t pk_stuffPacket(VPacket* pck, uint8_t key, uint8_t* payload, size_t payloadLen, Route* route);

// we should replace this w/ the stuff-packet and the reverse-route call, 
// uint16_t pk_writeReply_plsReplace(uint8_t* ogGram, uint8_t* gram, uint16_t maxGramLength, uint8_t* payload, uint16_t payloadLen);

#endif
