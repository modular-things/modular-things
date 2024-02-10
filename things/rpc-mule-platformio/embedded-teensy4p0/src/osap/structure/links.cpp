// links ! 

#include "links.h"
#include "../packets/packets.h"
#include "../utils/serializers.h"

#include "../utils/debug.h"

LGateway::LGateway(OSAP_Runtime* _runtime){
  // track our runtime, 
  runtime = _runtime;

  // don't over-insert: 
  if(runtime->portCount >= OSAP_CONFIG_MAX_LGATEWAYS){
    OSAP_ERROR("too many links instantiated...");
    return;
  } 
  
  // collect our index and stash ourselves in the runtime, 
  index = runtime->portCount;
  runtime->lgateways[runtime->lgatewayCount ++] = this;
}

void LGateway::ingestPacket(VPacket* pck){
  // this should be the case, badness if not
  if(pck->data[pck->data[0]] != TKEY_LINKF){
    OSAP_ERROR("bad PTR during packet ingest at link " + String(index));
    relinquishPacketToStack(pck);
    return;
  }
  // otherwise copy-in our index for rev-ersal, 
  uint16_t wptr = pck->data[0] + 1;
  serializers_writeUint16(pck->data, &wptr, index);
  // bump the pointer up, 
  pck->data[0] += TKEY_LINKF_INC;
  // and calculate a service deadline, 
  uint16_t perHopTimeToLive = serializers_readUint16(pck->data, 1);
  pck->serviceDeadline = millis() + perHopTimeToLive;
}