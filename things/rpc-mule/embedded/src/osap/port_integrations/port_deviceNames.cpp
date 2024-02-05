// named thing

#include "port_deviceNames.h"
#include "../utils/serializers.h"

#include "../utils/debug.h"

// ... we would also want to include our micro-specific NVM libraries here ... 

OSAP_Port_DeviceNames::OSAP_Port_DeviceNames(
  const char* _typeName
  ) : VPort(OSAP_Runtime::getInstance())
{
  // copy the name in, 
  strncpy(typeName, _typeName, PDNAMES_NAME_MAX_CHARS);
  // strncpy *does* guard against over-writing, 
  // but if src is too long it doesn't insert the tailing 0...
  // so we do it, just-in-case, 
  typeName[PDNAMES_NAME_MAX_CHARS - 1] = '\0';
  // and set our type 
  typeKey = PTYPEKEY_DEVICENAMES;
}

// ------------------------------------ Platform Dependent Codes

#if defined(ARDUINO_ARCH_MBED_RP2040) || defined(ARDUINO_ARCH_RP2040)
#include <EEPROM.h>
#else
#include <FlashStorage_SAMD.h>
#endif

const int WRITTEN_SIGGY = 0xBEEFDEED;
const int STORAGE_ADDR = 0;
char tempStr[PDNAMES_NAME_MAX_CHARS];

void OSAP_Port_DeviceNames::begin(void){
  int signature;
  
  #if defined(ARDUINO_ARCH_MBED_RP2040) || defined(ARDUINO_ARCH_RP2040)
  EEPROM.begin(4096);
  #endif 

  EEPROM.get(STORAGE_ADDR, signature);
  if(signature == WRITTEN_SIGGY){
    // has-been written in the past... 
    EEPROM.get(STORAGE_ADDR + sizeof(signature), tempStr);
    // stash it into our current... and safe-t cheque delimiting zero
    strncpy(uniqueName, tempStr, PDNAMES_NAME_MAX_CHARS);
    uniqueName[PDNAMES_NAME_MAX_CHARS - 1] = '\0';
  }
}

void OSAP_Port_DeviceNames::setUniqueName(const char* _uniqueName){
  strncpy(uniqueName, _uniqueName, PDNAMES_NAME_MAX_CHARS);
  uniqueName[PDNAMES_NAME_MAX_CHARS - 1] = '\0';
  // report! 
  OSAP_DEBUG("cmt: " + String(uniqueName));
  // and we'll want to write that to memory:
  // IDK if the intermediary `tempStr` is necessary, but it works, so am leaving it 
  strncpy(tempStr, uniqueName, PDNAMES_NAME_MAX_CHARS);
  EEPROM.put(STORAGE_ADDR, WRITTEN_SIGGY);
  EEPROM.put(STORAGE_ADDR + sizeof(WRITTEN_SIGGY), tempStr);
  EEPROM.commit();
}

// ------------------------------------ End Platform Dependent Codes

void OSAP_Port_DeviceNames::onPacket(uint8_t* data, size_t len, Route* sourceRoute, uint16_t sourcePort){
  switch(data[0]){
    case PDNAMEKEY_NAMEGET_REQ:
      {
        // formulate our reply... 
        uint16_t wptr = 0;
        _payload[wptr ++] = PDNAMEKEY_NAMEGET_RES;
        _payload[wptr ++] = data[1];
        // implicit here is that... we'll have to use another port on the other 
        // side, to send these msgs, or just do it one-at-a-time at most, 
        // I think that's chill though 
        serializers_writeString(_payload, &wptr, typeName);
        serializers_writeString(_payload, &wptr, uniqueName);
        // and ship it back... 
        send(_payload, wptr, sourceRoute, sourcePort);
      }
      break;
    case PDNAMEKEY_NAMESET_REQ:
      {
        // write-in to unique,
        uint16_t wptr = 0;
        _payload[wptr ++] = PDNAMEKEY_NAMESET_RES;
        _payload[wptr ++] = data[1];
        // 1 to ack-ok, 0 if we (i.e.) have no flash and can't do this 
        _payload[wptr ++] = 1; 
        // erp, get a string ? and let's pack the length back, 
        // this is useful largely for debugging / check-summing... 
        _payload[wptr ++] = serializers_readString(data, 2, tempStr, PDNAMES_NAME_MAX_CHARS);
        // ... set that
        setUniqueName(tempStr);
        // e's ackin:
        send(_payload, wptr, sourceRoute, sourcePort);
      }
      break;
  }
}