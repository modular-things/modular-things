// data send-er, one-sided, one-channeled 

#ifndef PORT_ONE_PIPE_H_
#define PORT_ONE_PIPE_H_

#include "../structure/ports.h"

#define PONEPIPE_SETUP 44
#define PONEPIPE_SETUP_RES 45 
#define PONEPIPE_MSG 77 
#define PONEPIPE_NAME_MAX_CHARS 32

class OSAP_Port_OnePipe : public VPort {
  public:
    OSAP_Port_OnePipe(const char* _name);
    void onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort) override;
    // yarp yarp 
    void write(uint8_t* data, size_t len);
  private:
    char name[PONEPIPE_NAME_MAX_CHARS];
    uint16_t upPort = 0;
    Route upRoute;
    uint8_t outBuffer[OSAP_CONFIG_PACKET_MAX_SIZE];
};

#endif 