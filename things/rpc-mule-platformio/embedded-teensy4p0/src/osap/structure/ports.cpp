// pert pert pert 

#include "ports.h"
#include "../packets/packets.h"

#include "../utils/debug.h"

// default constructor 
VPort::VPort(OSAP_Runtime* _runtime){
  // track our runtime, 
  runtime = _runtime;

  // don't over-insert: 
  if(runtime->portCount >= OSAP_CONFIG_MAX_PORTS){
    OSAP_ERROR("too many ports instantiated...");
    return;
  } 
  
  // collect our index and stash ourselves in the runtime, 
  index = runtime->portCount;
  runtime->ports[runtime->portCount ++] = this;
}

uint8_t VPort::_payload[OSAP_CONFIG_PACKET_MAX_SIZE];

// virtual-only;
// size_t VPort::getPacket(uint8_t* data, Route* route, uint16_t* sourcePort){
// }

// default begin code...
void VPort::begin(void){};

boolean VPort::clearToSend(void){
  return getPacketCheck(this);
}

void VPort::send(uint8_t* data, size_t len, Route* route, uint16_t destinationPort){
  // allocate & check, 
  VPacket* pck = getPacketFromStack(this);
  if(pck == nullptr) {
    OSAP_ERROR("bad packet allocate on vport.send() at " + String(index));
    return;
  }
  // stuff it, 
  stuffPacketPortToPort(pck, route, index, destinationPort, data, len);
  // I think that's actually it ? 
}