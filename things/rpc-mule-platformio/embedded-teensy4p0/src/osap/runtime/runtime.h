// runtime !

#ifndef RUNTIME_H_
#define RUNTIME_H_

#include <Arduino.h>
#include "../osap_config.h"
#include "../packets/routes.h"

// let linker find 'em later (?) 

class VPacket;
class VPort;
class LGateway;

class OSAP_Runtime {
  public:
    // con-structor, 
    OSAP_Runtime(void);

    // startup the OSAP instance and link layers 
    void begin(void);
    // operate the runtime 
    void loop(void);

    // ute-aids, 
    void attachDebugFunction(void (*_printFuncPtr)(String));
    // and debug-'ers 
    static void error(String msg);
    static void debug(String msg);

    // big-debuggers we compile guard... 
    #ifdef OSAP_CONFIG_INCLUDE_DEBUG_MSGS
    static String printRoute(Route* route);
    #endif 

    // instance-getter, for singleton-ness, 
    static OSAP_Runtime* getInstance(void);

    // lists ! 
    VPort* ports[OSAP_CONFIG_MAX_PORTS];
    uint16_t portCount = 0;
    LGateway* lgateways[OSAP_CONFIG_MAX_LGATEWAYS];
    uint16_t lgatewayCount = 0;
    // BGateway* bgateways[OSAP_CONFIG_MAX_BGATEWAYS];
    uint16_t bgatewayCount = 0;

  private:
    // only one among us 
    static OSAP_Runtime* instance;
    
    // stack (!) 
    VPacket* stack;
    size_t stackSize;

    // utility objs, 
    static Route _route;
    static uint8_t _payload[OSAP_CONFIG_PACKET_MAX_SIZE];

    // graph traversals need to recognize loops, 
    // so we stash a stateful id of last-to-scope-check-us, 
    // so that traversers can connect dots... it's four random bytes 
    uint8_t previousTraverseID[4] = { 0, 0, 0, 0 };

    // local ute for transport-query replies, 
    // this stuffs replies back into the same packet-allocation, 
    // so we don't need to re-allocate stack, etc, 
    void reply(VPacket* pck, uint8_t* data, size_t len);

    // and those debug utes 
    static void (*printFuncPtr)(String);
};

#endif 