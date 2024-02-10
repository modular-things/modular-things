// message escape-er 

#include "port_messageEscape.h"
#include "../utils/serializers.h"

OSAP_Port_MessageEscape* OSAP_Port_MessageEscape::instance = nullptr;

OSAP_Port_MessageEscape* OSAP_Port_MessageEscape::getInstance(void){
  return instance;
}

OSAP_Port_MessageEscape::OSAP_Port_MessageEscape(void) : VPort(OSAP_Runtime::getInstance()){
  typeKey = PTYPEKEY_MESSAGE_ESCAPE;
  if(instance == nullptr){
    instance = this;
  }
};

void OSAP_Port_MessageEscape::onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort){
  // make ahn readpointer
  uint16_t rptr = 0;
  switch(data[rptr ++]){
    // remote can ask us to update our outgoing route / port: 
    case PESCAPE_ROUTESET:
      // we're going to reply to these... always, 
      escapePort = sourcePort;
      // we should stash the flipped route, 
      escapePath.encodedPathLen = sourceRoute->encodedPathLen;
      escapePath.perHopTimeToLive = sourceRoute->perHopTimeToLive;
      escapePath.maxSegmentSize = sourceRoute->maxSegmentSize;
      // then the actual... (no memory guards lol good luck)
      memcpy(escapePath.encodedPath, &(sourceRoute->encodedPath), escapePath.encodedPathLen);
      // then we done baby, 
      break;
  };
}

uint8_t outBuffer[OSAP_CONFIG_PACKET_MAX_SIZE];

void OSAP_Port_MessageEscape::escape(String msg){
  // some chance we call this w/o initializing, so: 
  if(instance == nullptr) return;
  // and these would prevent us from tx'ing as well, 
  if(!instance->clearToSend()) return;
  if(instance->escapePath.encodedPathLen == 0) return;
  // no bigboys, but arbitrary size (should use msg route length)
  if(msg.length() + 1 > 128) return;
  // so, carry on:
  uint16_t wptr = 0;
  outBuffer[wptr ++] = PESCAPE_MSG;
  // and... IDK one-hundo about this char* cast, but we're not editing it so... 
  serializers_writeString(outBuffer, &wptr, (char*)(msg.c_str()));
  // that's it, 
  instance->send(outBuffer, wptr, &(instance->escapePath), instance->escapePort);
}