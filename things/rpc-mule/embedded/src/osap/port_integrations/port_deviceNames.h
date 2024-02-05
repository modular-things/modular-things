// to give devices type- and unique- names 

#ifndef PORT_DEVICENAMES_H_
#define PORT_DEVICENAMES_H_

#include "../structure/ports.h"

#define PDNAMES_NAME_MAX_CHARS 32

#define PDNAMEKEY_NAMEGET_REQ 1
#define PDNAMEKEY_NAMEGET_RES 2
#define PDNAMEKEY_NAMESET_REQ 3
#define PDNAMEKEY_NAMESET_RES 4

class OSAP_Port_DeviceNames : public VPort {
  public:
    // -------------------------------- Constructors
    OSAP_Port_DeviceNames(const char* _typeName);

    // override the begin func, so that we can check flash etc 
    void begin(void) override;

    // override-this,
    void onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort) override;

    // optional, settable unique-name:
    void setUniqueName(const char* _uniqueName);

  private:
    char typeName[PDNAMES_NAME_MAX_CHARS] = "defaultDeviceName";
    char uniqueName[PDNAMES_NAME_MAX_CHARS] = "dfltName";
};

#endif