// link ! 
// TODO: pls use nanocobs, for encode- and decode-in-place, to save big (!) memory 
// on new link layer... to fit into D11s... 

#include "COBSUSBSerial.h"
#include "utils/cobs.h"


#if defined(ARDUINO_ARCH_RP2040) || defined(ARDUINO_ARCH_RP2040)
COBSUSBSerial::COBSUSBSerial(SerialUSB* _usbcdc){
  usbcdc = _usbcdc;
}
#else 
COBSUSBSerial::COBSUSBSerial(Serial_* _usbcdc){
  usbcdc = _usbcdc;
}
#endif 

void COBSUSBSerial::begin(void){
  usbcdc->begin(9600);
}

void COBSUSBSerial::loop(void){
  // check RX side:
  // while data & not-full, 
  while(usbcdc->available() && rxBufferLen == 0){
    rxBuffer[rxBufferWp ++] = usbcdc->read();
    if(rxBuffer[rxBufferWp - 1] == 0){
      // decoding in place should always work: COBS doesn't revisit bytes 
      // encoding in place would be a different trick, and would require the use of 
      // nanocobs from this lad: https://github.com/charlesnicholson/nanocobs 
      size_t len = cobsDecode(rxBuffer, 255, rxBuffer);
      // now we are with-packet, set length and reset write pointer 
      // len includes the trailing 0, rm that... 
      rxBufferLen = len - 1; 
      rxBufferWp = 0;
    }
  }

  // check tx side, 
  while(txBufferLen && usbcdc->availableForWrite()){
    // ship a byte, 
    usbcdc->write(txBuffer[txBufferRp ++]);
    // if done, mark empty
    if(txBufferRp >= txBufferLen){
      txBufferLen = 0;
      txBufferRp = 0;
    }
  }
}

size_t COBSUSBSerial::getPacket(uint8_t* dest){
  if(rxBufferLen > 0){
    memcpy(dest, rxBuffer, rxBufferLen);
    size_t len = rxBufferLen;
    rxBufferLen = 0;
    return len;
  } else {
    return 0;
  }
}

boolean COBSUSBSerial::clearToRead(void){
  return (rxBufferLen > 0);
}

void COBSUSBSerial::send(uint8_t* packet, size_t len){
  // ship it! blind! 
  size_t encodedLen = cobsEncode(packet, len, txBuffer);
  // stuff 0 byte, 
  txBuffer[encodedLen] = 0;
  txBufferLen = encodedLen + 1;
  txBufferRp = 0;
}

boolean COBSUSBSerial::clearToSend(void){
  // we're CTS if we have nothing in the outbuffer, 
  return (txBufferLen == 0);
}

// we should do some... work with this, i.e. 
// keepalives, to detect if other-end is open or not... 
boolean COBSUSBSerial::isOpen(void){
  if(usbcdc){
    return true;
  } else {
    return false; 
  }
}