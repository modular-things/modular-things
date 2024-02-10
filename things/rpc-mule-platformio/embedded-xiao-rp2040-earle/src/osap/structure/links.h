// links ! 

#ifndef LINKS_H_
#define LINKS_H_

#include "../runtime/runtime.h"
#include "../utils/keys.h"

class LGateway {
  public:
    // -------------------------------- Link-Implementers Author these Funcs
    // implement a .begin() to startup the link, 
    virtual void begin(void) = 0;

    // implement a function that is called once per runtime, 
    virtual void loop(void) = 0;

    // implement a function that reports whether/not 
    // the link is ready to send new data 
    virtual boolean clearToSend(void) = 0;

    // implement a function that reports whether/not 
    // the link is open... 
    virtual boolean isOpen(void) = 0;

    // implement a function that transmits this packet, 
    virtual void send(uint8_t* data, size_t len) = 0;

    // -------------------------------- Link-Implementers use these funcs 

    // having written off-the-line data into `pck` during loop, 
    // implementer calls this 
    void ingestPacket(VPacket* pck);

    // -------------------------------- Constructors

    LGateway(OSAP_Runtime* _runtime);

    // -------------------------------- Properties 

    uint8_t typeKey = LGATEWAYTYPEKEY_NULL;

    // -------------------------------- States 
    uint8_t currentPacketHold = 0;
    uint8_t maxPacketHold = 2;

    private:
      OSAP_Runtime* runtime;
      uint16_t index; 
};

#endif 