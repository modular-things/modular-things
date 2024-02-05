// das link 

#include "link_cobsUsbSerial.h"
#include "../packets/packets.h"

#if defined(ARDUINO_ARCH_RP2040) || defined(ARDUINO_ARCH_RP2040)
OSAP_Gateway_USBSerial::OSAP_Gateway_USBSerial(SerialUSB* usbcdc):
  LGateway(OSAP_Runtime::getInstance()), // call the lgateway constructor, 
  cobsUsbSerialLink(usbcdc)           // call the link constructor 
{
  // set type...
  typeKey = LGATEWAYTYPEKEY_USBSERIAL;
}
#else 
OSAP_Gateway_USBSerial::OSAP_Gateway_USBSerial(Serial_* usbcdc):
  LGateway(OSAP_Runtime::getInstance()), // call the lgateway constructor, 
  cobsUsbSerialLink(usbcdc)           // call the link constructor 
{
  // set type...
  typeKey = LGATEWAYTYPEKEY_USBSERIAL;
}
#endif 

void OSAP_Gateway_USBSerial::begin(void){
  cobsUsbSerialLink.begin();
}

void OSAP_Gateway_USBSerial::loop(void){
  // run the code... 
  cobsUsbSerialLink.loop();
  // if we can allocate on the message stack & also have packets, 
  if(getPacketCheck(this) && cobsUsbSerialLink.clearToRead()){
    // allocate the packet to us, 
    VPacket* pck = getPacketFromStack(this);
    // this pattern lets us avoid doing two memcpy's on the data, 
    // here we write it direct into the stack: 
    pck->len = cobsUsbSerialLink.getPacket(pck->data);
    // and run this ute to reverse the route & increment the pointer 
    ingestPacket(pck);
  }
}

boolean OSAP_Gateway_USBSerial::clearToSend(void){
  return cobsUsbSerialLink.clearToSend();
}

boolean OSAP_Gateway_USBSerial::isOpen(void){
  return cobsUsbSerialLink.isOpen();
}

void OSAP_Gateway_USBSerial::send(uint8_t* data, size_t len){
  cobsUsbSerialLink.send(data, len);
}