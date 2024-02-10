// das named-port

#include "port_named.h"
#include "../utils/serializers.h"

#include "../utils/debug.h"

OSAP_Port_Named::OSAP_Port_Named(
  const char* _name, 
  size_t (*_onMsgFunction)(uint8_t* data, size_t len, uint8_t* reply)
  ) : VPort(OSAP_Runtime::getInstance())
{
  // stash name & func, 
  strncpy(name, _name, PNAMED_NAME_MAX_CHARS);
  onMsgFunctionWithReply = _onMsgFunction;
  // report type
  typeKey = PTYPEKEY_NAMED;
}

OSAP_Port_Named::OSAP_Port_Named(
  const char* _name, 
  void (*_onMsgFunction)(uint8_t* data, size_t len)
  ) : VPort(OSAP_Runtime::getInstance())
{
  // stash name & func, 
  strncpy(name, _name, PNAMED_NAME_MAX_CHARS);
  onMsgFunctionWithoutReply = _onMsgFunction;
  // report type
  typeKey = PTYPEKEY_NAMED;
}

void OSAP_Port_Named::onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort){
  switch(data[0]){
    case PNAMED_NAMEREQ:
      {
        // write the key and copy the msg id, 
        uint16_t wptr = 0;
        _payload[wptr ++] = PNAMED_NAMERES;
        _payload[wptr ++] = data[1];
        // write name 
        serializers_writeString(_payload, &wptr, name);
        // aaand reply, we're done: 
        send(_payload, wptr, sourceRoute, sourcePort);
      }
      break;
    case PNAMED_MSG:
      {
        // we'll have at least this much reply: 
        uint16_t wptr = 0;
        _payload[wptr ++] = PNAMED_ACK;
        _payload[wptr ++] = data[1];
        // call whichever func was attached by alternate constructors:
        if(onMsgFunctionWithReply != nullptr){
          // w/ reply: present payload's 1th byte as *data 
          // total replyLen is app's replyLen + 1 for the KEY_ACK, 
          wptr += onMsgFunctionWithReply(&(data[2]), len - 2, &(_payload[2]));
        } else {
          // otherwise just blind-call it & ack will ship w/ key only 
          onMsgFunctionWithoutReply(&(data[2]), len - 2);
        }
        // ship it back 
        send(_payload, wptr, sourceRoute, sourcePort);
      }
      break;
    // we shouldn't encounter these in any embedded codes yet: 
    case PNAMED_NAMERES:
    case PNAMED_ACK:
      OSAP_ERROR("PNAMED_NAMERES or ACK to fancy-embedded-implementer");
      break;
    default:
      OSAP_ERROR("borked fancyport msg w/ 1st byte " + String(data[0]));
      break;
  }
}
