// runtime !

#include "runtime.h"
#include "../packets/packets.h"
#include "../utils/serializers.h"

#include "../osap_config.h"
#include "../utils/debug.h"

// ---------------------------------------------- Singleton

OSAP_Runtime* OSAP_Runtime::instance = nullptr;

OSAP_Runtime* OSAP_Runtime::getInstance(void){
  return instance;
}

// and a coupl'a static-stashes 

void (*OSAP_Runtime::printFuncPtr)(String) = nullptr;

Route OSAP_Runtime::_route;

uint8_t OSAP_Runtime::_payload[OSAP_CONFIG_PACKET_MAX_SIZE];

// ---------------------------------------------- Message Stack and Constructor

// stack size modifies how much memory the device sucks, 
// it should be configured per-micro-platform (?) or sth, 
// we need some arduino help... other options are to expose 
// memory allocation to the user, but it's a little awkward 

VPacket _stack[OSAP_CONFIG_STACK_SIZE];

OSAP_Runtime::OSAP_Runtime(void){
  // collect stack from the file scope,
  stack = _stack;
  stackSize = OSAP_CONFIG_STACK_SIZE;
  // we're the one & only, unless we aren't, 
  if(instance == nullptr){
    instance = this;
  }
}

// startup 
void OSAP_Runtime::begin(void){
  // TODO: startup link-list, 
  stackReset(stack, stackSize);
  // for each link in list, do link->begin();
  for(uint16_t l = 0; l < lgatewayCount; l ++){
    lgateways[l]->begin();
  }
  // for each port, do port->begin();
  for(uint16_t p = 0; p < portCount; p ++){
    ports[p]->begin();
  }
}

// ---------------------------------------------- Core Runtime Loop 

// at most we can handle every single packet in 
// the system during one loop, so here's the ordered list of 'em
VPacket* packets[OSAP_CONFIG_STACK_SIZE];

void OSAP_Runtime::loop(void){
  // (0) check the time, 
  uint32_t now = millis();

  // (1) run each links' loop code:
  for(uint16_t l = 0; l < lgatewayCount; l ++){
    if(lgateways[l] != nullptr) lgateways[l]->loop();
  }

  // (2) collect paquiats from the staquiat,
  size_t count = stackGetPacketsToService(packets, OSAP_CONFIG_STACK_SIZE);

  // (2.5 TODO) packets are sorted insertion-order already, in the future we can 
  // re-sort by serviceDeadline, 

  // (3) operate per-packet, 
  for(uint8_t p = 0; p < count; p ++){

    // (3:1) time out deadies, 
    if(packets[p]->serviceDeadline < now){
      OSAP_DEBUG("packet t/o");
      relinquishPacketToStack(packets[p]);
      continue;
    }

    // (3:2) service the packet's instruction, 
    // ... pck[0] is a pointer to the active instruction, 
    // so pck[pck[0]] == OPCODE, basically 
    VPacket* pck = packets[p];
    switch(pck->data[pck->data[0]]){
      // -------------------- Packets destined for a port in this runtime:
      case TKEY_PORTPACK: 
        {
          // deliver the packet to this port, from that one... 
          uint16_t sourceIndex = serializers_readUint16(pck->data, pck->data[0] + 1);
          uint16_t destinationIndex = serializers_readUint16(pck->data, pck->data[0] + 3);
          // if we've got one, 
          if(destinationIndex < portCount){
            // copy the route out into our temp-stash, 
            getRouteFromPacket(pck, &_route);
            // reverse that, 
            _route.reverse();
            // copy the datagram out, since packet might be re-allocated
            // during the func call: 
            size_t payloadLen = pck->len - (pck->data[0] + 5);
            memcpy(_payload, &(pck->data[pck->data[0] + 5]), payloadLen);
            // now we can dooo
            // (1) de-allocate the packet, means we have guaranteed-clear space 
            // if the func call below wants to re-allocate: 
            relinquishPacketToStack(pck);
            // (2) call the func
            ports[destinationIndex]->onPacket(_payload, payloadLen, &_route, sourceIndex);
            // that's it ? 
          } else {
            OSAP_ERROR("msg to non-existent port " + String(destinationIndex));
            relinquishPacketToStack(pck);
          }
        }
        break;
      // -------------------- Packets for us to forward along one of our links:
      case TKEY_LINKF:
        {
          // collect the index 
          uint16_t index = serializers_readUint16(pck->data, pck->data[0] + 1);
          // pass checks 
          if(index > lgatewayCount){
            OSAP_ERROR("linkf along non-existent link " + String(index));
            relinquishPacketToStack(pck);
            break;
          } else if (lgateways[index] == nullptr){
            OSAP_ERROR("linkf along non-existent link" + String(index));
            relinquishPacketToStack(pck);
            break;
          } else {
            // send if clear, wait if not 
            if(lgateways[index]->clearToSend()){
              lgateways[index]->send(pck->data, pck->len);
              relinquishPacketToStack(pck);
            } else {
              // awaiting (!) 
            }
          }
        }
        break;
      // -------------------- Packets for us to forward along one of our busses:
      case TKEY_BUSF:
        OSAP_ERROR("not-yet servicing busses...");
        relinquishPacketToStack(pck);
        break;
      // -------------------- Graph traversal high-level query:
      case TKEY_RUNTIMEINFO_REQ:
        {
          // 45452 vs. 45444 (direct-write is less-flash than wptr ++)
          // reply to a scope-request,
          // it's the scope response, w/ matched ID 
          _payload[0] = TKEY_RUNTIMEINFO_RES;
          _payload[1] = pck->data[pck->data[0] + 1];
          // traverseID handoff:
          // copy-old into packet, 
          memcpy(&(_payload[2]), previousTraverseID, 4);
          // copy-new into stash: 
          memcpy(previousTraverseID, &(pck->data[pck->data[0] + 2]), 4);
          // report build-type, 
          _payload[6] = BTYPEKEY_EMBEDDED_CPP;
          // osap-version, 
          _payload[7] = OSAP_VERSION_MAJOR;
          _payload[8] = OSAP_VERSION_MID;
          _payload[9] = OSAP_VERSION_MINOR;
          // we stuff the first-exit instruction in here 
          // since the scanner will be reconstructing the graph, 
          // they need to know how tf this mf' entered this rt, so we do:
          getRouteFromPacket(pck, &_route);
          // we can copy-pasta 5 of these bytos:
          memcpy(&(_payload[10]), _route.encodedPath, 5);
          // it *might* be from-ourselves, though probably not for some time
          // this is the only case where we should be sure about the 1st byte
          // not coming from random memory:
          if(_route.encodedPathLen == 0){
            _payload[10] = 0;
          }
          // ports-count, links-count, busses-count, 
          serializers_writeUint16(_payload, 15, portCount);
          serializers_writeUint16(_payload, 17, lgatewayCount);
          serializers_writeUint16(_payload, 19, bgatewayCount);
          // and reply w/ this ute, 
          reply(pck, _payload, 20);
        }
        break;
      // -------------------- Gets high-level info on groups of ports... 
      case TKEY_PORTINFO_REQ:
        {
          // req'r is asking for info on a spread of ports:
          uint16_t startIndex = serializers_readUint16(pck->data, pck->data[0] + 2);
          uint16_t endIndex = serializers_readUint16(pck->data, pck->data[0] + 4);
          // we just back-fill: 
          uint16_t wptr = 0;
          // msg-type-key and id:
          _payload[wptr ++] = TKEY_PORTINFO_RES;
          _payload[wptr ++] = pck->data[pck->data[0] + 1];
          // what's the max. stuffing length ?
          // maxSegSize is stuffed in-packet at 3, 
          // pck->data[0] points to current end-of-route, 
          // and use two bytes for grace 
          uint16_t maxReplyLength = serializers_readUint16(pck->data, 3) - pck->data[0] - 2;
          // inclusive of start, exclusive of end: 
          for(uint16_t i = startIndex; i < endIndex; i ++){
            // break if we are over-sized: 
            if(wptr > maxReplyLength) break;
            // break if we are past end of all-ports:
            if(i > portCount) break;
            // stuff types, or nullsets:
            if(ports[i] == nullptr){
              _payload[wptr ++] = PTYPEKEY_NULL;
            } else {
              _payload[wptr ++] = ports[i]->typeKey;
            }
          } // end stuff-routine
          // reply 2 sender:
          reply(pck, _payload, wptr);
        }
        break;
      // -------------------- Get high-level info on groups of links... 
      case TKEY_LGATEWAYINFO_REQ:
        {
          // similar to the PORTINFO_REQ, this is asking for info on 
          // a spread of ports, however, lgateways are max 0-255, so:
          uint8_t startIndex = pck->data[pck->data[0] + 2];
          uint8_t endIndex = pck->data[pck->data[0] + 3];
          // OSAP_DEBUG(String(startIndex) + " : " + String(endIndex));
          // and we can do... 
          uint16_t wptr = 0;
          _payload[wptr ++] = TKEY_LGATEWAYINFO_RES;
          _payload[wptr ++] = pck->data[pck->data[0] + 1];
          // and we fill, mindful again of max lengths:
          uint16_t maxReplyLength = serializers_readUint16(pck->data, 3) - pck->data[0] - 2;
          // inclusive of start, exclusive of end: 
          for(uint8_t i = startIndex; i < endIndex; i ++){
            // check-each, 
            if(wptr > maxReplyLength) break;
            if(i > lgatewayCount) break;
            // and fill, reporting type-key and open-ness, 
            if(lgateways[i] == nullptr){
              _payload[wptr ++] = LGATEWAYTYPEKEY_NULL;
              _payload[wptr ++] = 0;
            } else {
              _payload[wptr ++] = lgateways[i]->typeKey;
              _payload[wptr ++] = lgateways[i]->isOpen() ? 1 : 0;
            }
          } // end stuff-routine
          // reply 2 sender 
          reply(pck, _payload, wptr);
        }
        break;
      // -------------------- Get high-level info on groups of busses... 
      case TKEY_BGATEWAYINFO_REQ:
        // TODO: busses should stuff the type of bus & then the 32-byte (256-bit)
        // open (1) / closed (0) state... 
        OSAP_ERROR("not-yet servicing busses...");
        relinquishPacketToStack(pck);
        break;
      // -------------------- Resolutions to graph discovery requests, 
      // though we've not yet written the request-issuers in embedded, 
      // so rx'ing one of these would mean an error someplace else, 
      case TKEY_RUNTIMEINFO_RES:
      case TKEY_LGATEWAYINFO_RES:
      case TKEY_BGATEWAYINFO_RES:
        OSAP_ERROR("not-yet issuing scope/state reqs from embedded, rx'd res");
        relinquishPacketToStack(pck);
        break;
      default:
        OSAP_ERROR("unlikely TKEY in loop: " + String(pck->data[pck->data[0]]));
        relinquishPacketToStack(pck);
        break;
    }
  } // end for p-in-packets, 
}

void OSAP_Runtime::reply(VPacket* pck, uint8_t* data, size_t len){
  // extract the route & reverse it, 
  getRouteFromPacket(pck, &_route);
  // OSAP_DEBUG(OSAP_DEBUG_PRINT_ROUTE(&_route));
  _route.reverse();
  // since the packet is already allocated (wherever the msg was sourced)
  // we can just bonk it back in, i.e. re-write to the same data location:
  stuffPacketRaw(pck, &_route, data, len);
  // that's actually all there is to it (!) the reply is now loaded in, runtime collects & manages 
}

// ---------------------------------------------- Debug Funcs and Attach-er

void OSAP_Runtime::attachDebugFunction(void (*_printFuncPtr)(String)){
  OSAP_Runtime::printFuncPtr = _printFuncPtr;
}

void OSAP_Runtime::error(String msg){
  if(printFuncPtr == nullptr) return;
  OSAP_Runtime::printFuncPtr(msg);
}

void OSAP_Runtime::debug(String msg){
  if(printFuncPtr == nullptr) return;
  OSAP_Runtime::printFuncPtr(msg);
}

#ifdef OSAP_CONFIG_INCLUDE_DEBUG_MSGS
String OSAP_Runtime::printRoute(Route* route){
  String msg;
  // this could be ~ fancier, i.e. decoding as well... 
  // see routes.ts::print for an example
  for(uint8_t p = 0; p < route->encodedPathLen; p ++){
    msg += String(route->encodedPath[p]) + ", ";
  }
  return msg;
}
#endif 