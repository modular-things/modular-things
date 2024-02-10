// message escape-er, 

#ifndef PORT_MESSAGE_ESCAPE_H_
#define PORT_MESSAGE_ESCAPE_H_

#include "../structure/ports.h"

#define PESCAPE_ROUTESET 44
#define PESCAPE_MSG 77

class OSAP_Port_MessageEscape : public VPort {
  public: 
    // -------------------------------- Constructor
    OSAP_Port_MessageEscape(void);
    // we have to override this rx'er, 
    void onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort) override;
    // simple API, right ? and should be singleton, so:
    static void escape(String msg);
    static OSAP_Port_MessageEscape* getInstance(void);  
  private: 
    uint16_t escapePort = 0;
    Route escapePath;
    static OSAP_Port_MessageEscape* instance;
};

#endif 