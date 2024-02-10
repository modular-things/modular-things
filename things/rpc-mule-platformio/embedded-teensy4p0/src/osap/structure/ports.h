// port port pert 
// no bare ports: must implement thru child 

#ifndef PORTS_H_
#define PORTS_H_

#include "../runtime/runtime.h"
#include "../packets/routes.h"
#include "../utils/keys.h"

class VPort {
  public:
    // -------------------------------- Port-Facing API
    // returns true if there is space available to write a packet into the vport 
    boolean clearToSend(void);
    // sends data of len along the provided route, to another port
    // be sure to check if you are .clearToSend beforehand 
    void send(uint8_t* data, size_t len, Route* route, uint16_t destinationPort);

    // -------------------------------- Runtime-Facing API
    virtual void begin(void);
    virtual void onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort) = 0;

    // -------------------------------- Constructors

    // default constructor 
    VPort(OSAP_Runtime* _runtime);

    // -------------------------------- Properties 
    uint8_t typeKey = PTYPEKEY_NAKED;

    // -------------------------------- States
    uint8_t currentPacketHold = 0;
    uint8_t maxPacketHold = 2;

    // -------------------------------- stash-ute 
    static uint8_t _payload[OSAP_CONFIG_PACKET_MAX_SIZE];

  private:
    OSAP_Runtime* runtime;   // our runtime... 
    uint16_t index;     // our # 
};

#endif 