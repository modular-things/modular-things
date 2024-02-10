/*
osap/packets.cpp

common routines

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2021

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the osap project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

#include "packets.h"
#include "../utils/serializers.h"
#include "../utils/keys.h"
#include "../utils/debug.h"

// we have some file-scoped pointers, 
VPacket* queueStart;
VPacket* firstFree;

// ---------------------------------------------- Stack Utilities 

void stackReset(VPacket* stack, size_t stackSize){
  // reset each individual, 
  for(uint16_t p = 0; p < stackSize; p ++){
    stack[p].len = 0;
    stack[p].vport = nullptr;
    stack[p].lgateway = nullptr;
    stack[p].serviceDeadline = 0;
  }
  // set next ptrs, forwards pass
  for(uint16_t p = 0; p < stackSize - 1; p ++){
    stack[p].next = &(stack[p+1]);
  }
  stack[stackSize - 1].next = &(stack[0]);
  // set previous ptrs, reverse pass
  for(uint16_t p = 1; p < stackSize; p ++){
    stack[p].previous = &(stack[p-1]);
  }
  stack[0].previous = &(stack[stackSize - 1]);
  // queueStart element is [0], as is the firstFree, at startup,
  queueStart = &(stack[0]);
  firstFree = &(stack[0]);
}

size_t stackGetPacketsToService(VPacket** packets, size_t maxPackets){
  // this is the zero-packets case;
  if(firstFree == queueStart) return 0;
  // this is how many max we can possibly list,
  uint16_t iters = maxPackets < OSAP_CONFIG_STACK_SIZE ? maxPackets : OSAP_CONFIG_STACK_SIZE;
  // otherwise do...
  VPacket* pck = queueStart;
  uint16_t count = 0;
  for(uint16_t p = 0; p < iters; p ++){
    // stash it in the callers' list, 
    packets[p] = pck;
    // increment, 
    count ++;
    // check next-fullness, 
    // (if packet is allocated to a vport or a lgateway they would be linked)
    if(pck->next->vport == nullptr && pck->next->lgateway == nullptr){
      // if next is empty, this is final count:
      return count;
    } else {
      // if it ain't, collect next and continue stuffing
      pck = pck->next;
    }
  }
  // TODO: we could have an additional step here of sorting the list 
  // in decending deadline-time order... to manage priorities. we could *also*
  // sort-in-place, i.e. when a call is made to stuff-a-packet, check deadline, 
  // and sort into the linked list there... not a huge lift, just a little linked-list-tricky 
  // for the time being, we're just returning 'em 
  // end-of-loop thru all possible, none free, so:
  return count;
}

// ---------------------------------------------- Stack Allocators 
// TODO: templates would eliminate need for manually overloading each of these, 
// but templating in the core-core code might make it hard to port to very-tiny MCUs 

boolean getPacketCheck(VPort* vport){
  if(firstFree->vport == nullptr && firstFree->lgateway == nullptr && vport->currentPacketHold < vport->maxPacketHold){
    return true;
  } else {
    return false;
  }
}

boolean getPacketCheck(LGateway* lgateway){
  if(firstFree->vport == nullptr && firstFree->lgateway == nullptr && lgateway->currentPacketHold < lgateway->maxPacketHold){
    return true;
  } else {
    return false;
  }
}

VPacket* getPacketFromStack(VPort* vport){
  if(getPacketCheck(vport)){
    // allocate the firstFree in the queue to the requester, 
    VPacket* pck = firstFree;
    pck->vport = vport;
    vport->currentPacketHold ++;
    // increment, 
    firstFree = firstFree->next;
    // hand it over, 
    return pck;
  } else {
    return nullptr;
  }
}

VPacket* getPacketFromStack(LGateway* lgateway){
  if(getPacketCheck(lgateway)){
    VPacket* pck = firstFree;
    pck->lgateway = lgateway;
    lgateway->currentPacketHold ++;
    // increment, 
    firstFree = firstFree->next;
    // hand it over, 
    return pck;
  } else {
    return nullptr;
  }
}

void relinquishPacketToStack(VPacket* pck){
  // decriment-count per-point maximums 
  if(pck->vport){
    pck->vport->currentPacketHold --;
  } else if (pck->lgateway){
    pck->lgateway->currentPacketHold --;
  }
  // zero the packet out,
  pck->vport = nullptr;
  pck->lgateway = nullptr;
  // and these, just in case... 
  pck->len = 0;
  pck->serviceDeadline = 0;

  // now we can handle the stack free-ness, 
  // if it was at the start of the queue, that now 
  // begins at the next packet: 
  if(queueStart == pck){
    queueStart = pck->next;
  } else {
    // otherwise we un-stick it from the middle:
    pck->previous->next = pck->next;
    pck->next->previous = pck->previous;
    // now, insert this where the old firstFree was
    firstFree->previous->next = pck;
    pck->previous = firstFree->previous;
    pck->next = firstFree;
    firstFree->previous = pck;
    // and the item is the new firstFree element,
    firstFree = pck;
  }
}

// ---------------------------------------------- Route Retrieval 

// local ute, this figures where the last byte in the route is 
uint16_t routeEndScan(uint8_t* data, size_t maxLen){
  // 1st instruction is at pck[5] since we have | PTR | PHTTL:2 | MSS:2 | 
  uint16_t end = 5;
  while(true){
    switch(data[end]){
      case TKEY_LINKF:
        end += TKEY_LINKF_INC;
        break;
      case TKEY_BUSF:
        end += TKEY_BUSF_INC;
        break;
      default:
        return end;
    }
    if(end > maxLen) return maxLen;
  }
}

void getRouteFromPacket(VPacket* pck, Route* route){
  // ttl, segsize come out of the packet head, 
  // | PTR:1 | PHTTL:2 | MSS:2 | 
  route->perHopTimeToLive = serializers_readUint16(pck->data, 1);
  route->maxSegmentSize = serializers_readUint16(pck->data, 3);
  // get end-of-route location 
  uint16_t routeEndLocation = routeEndScan(pck->data, pck->len);
  // now we can memcpy the route's encoded-path section over, 
  memcpy(route->encodedPath, &(pck->data[5]), routeEndLocation - 5);
  // and the length, 
  route->encodedPathLen = routeEndLocation - 5;
}

// ---------------------------------------------- Packet Authorship 

uint16_t stuffPacketRoute(VPacket* pck, Route* route){
  // we share these 
  pck->data[0] = 5;
  // these write use a pointer, 
  uint16_t wptr = 5;
  serializers_writeUint16(pck->data, &wptr, route->perHopTimeToLive);
  serializers_writeUint16(pck->data, &wptr, route->maxSegmentSize);  
  // and the route, 
  memcpy(&(pck->data[5]), route->encodedPath, route->encodedPathLen);
  // we can addnl'y calculate the service deadline here, 
  pck->serviceDeadline = millis() + route->perHopTimeToLive;
  // return the end of this chunk, 
  return route->encodedPathLen + 5;
}

// stuffing into allocated packet, 
void stuffPacketRaw(VPacket* pck, Route* route, uint8_t* data, size_t len){
  // write pointer and route-writing, 
  uint16_t wptr = stuffPacketRoute(pck, route);
  // no bigguns... 
  if(len + wptr > route->maxSegmentSize){ 
    OSAP_ERROR("oversize raw-write" + String(wptr + len)); 
    len = 1; 
  }
  // now stuff the data, 
  memcpy(&(pck->data[wptr]), data, len);
  // service deadline was calc'd in stuffPacketRoute, 
  // that'd be it then, 
  pck->len = len + wptr;
}

// stuffing from:to port,
void stuffPacketPortToPort(VPacket* pck, Route* route, uint16_t sourcePort, uint16_t destinationPort, uint8_t* data, size_t len){
  // pretty similar to above, 
  uint16_t wptr = stuffPacketRoute(pck, route);
  // guard largess
  if(len + wptr + 5 > route->maxSegmentSize){ 
    OSAP_ERROR("oversize port-write" + String(wptr + len)); 
    len = 1; 
  }
  // author port-key-stuff, 
  pck->data[wptr ++] = TKEY_PORTPACK;
  serializers_writeUint16(pck->data, &wptr, sourcePort);
  serializers_writeUint16(pck->data, &wptr, destinationPort);
  // and stuff the payload ! 
  memcpy(&(pck->data[wptr]), data, len);
  // aaaaand we're done here... 
  pck->len = len + wptr;
}
