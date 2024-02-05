// integration-via-inheritance of the cobsusbserial link 

#ifndef LINK_COBS_USB_SERIAL_H_
#define LINK_COBS_USB_SERIAL_H_

// this... will need to not-suck, 
// it'll happen via <COBSUSBSerial.h> right ? 
#include "../lib/COBSerial/COBSUSBSerial.h"
#include "../structure/links.h"

class OSAP_Gateway_USBSerial : public LGateway {
  public:
    #if defined(ARDUINO_ARCH_RP2040) || defined(ARDUINO_ARCH_RP2040)
    OSAP_Gateway_USBSerial(SerialUSB* _usbcdc);
    #else 
    OSAP_Gateway_USBSerial(Serial_* _usbcdc);
    #endif 
    // startup the link, 
    void begin(void) override;
    // operate the link 
    void loop(void) override;
    // check clear ahead / open
    boolean clearToSend(void) override;
    boolean isOpen(void) override;
    // transmit along 
    void send(uint8_t* data, size_t len) override;
  private: 
    COBSUSBSerial cobsUsbSerialLink;
};

#endif 