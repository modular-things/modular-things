// pipe-er 

#include "port_onePipe.h"
#include "../utils/serializers.h"

OSAP_Port_OnePipe::OSAP_Port_OnePipe(const char* _name) : VPort(OSAP_Runtime::getInstance()){
  strncpy(name, _name, PONEPIPE_NAME_MAX_CHARS);
  typeKey = PTYPEKEY_ONE_PIPE;
}

void OSAP_Port_OnePipe::onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort){
  // readptr 
  uint16_t rptr = 0;
  switch(data[rptr ++]){
    case PONEPIPE_SETUP:
      {
        upPort = sourcePort;
        // and stash flipped route, 
        upRoute.encodedPathLen = sourceRoute->encodedPathLen;
        upRoute.perHopTimeToLive = sourceRoute->perHopTimeToLive;
        upRoute.maxSegmentSize = sourceRoute->maxSegmentSize;
        // then the actual... (no memory guards lol good luck)
        memcpy(upRoute.encodedPath, &(sourceRoute->encodedPath), upRoute.encodedPathLen);
        // then reply w/ our name:
        uint16_t wptr = 0;
        outBuffer[wptr ++] = PONEPIPE_SETUP_RES;
        serializers_writeString(outBuffer, &wptr, name);
        // and reply like... 
        send(outBuffer, wptr, sourceRoute, sourcePort);
      }
      // then we done baby, 
      break;
  }
}

void OSAP_Port_OnePipe::write(uint8_t* data, size_t len){
  // blind failure, beware !
  // could do...if not clear, stuff sample into datagram until are clear 
  if(!clearToSend()) return;
  // stuff it and... 
  uint16_t wptr = 0;
  outBuffer[wptr ++] = PONEPIPE_MSG;
  if(len > 128) return;
  memcpy(outBuffer + 1, data, len);
  wptr += len; 
  send(outBuffer, wptr, &upRoute, upPort);
  // we're done, lol ? x
}