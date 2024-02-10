// example cobs-encoded usb-serial link 

#include <Arduino.h>

class COBSUSBSerial {
  public: 
    #if defined(ARDUINO_ARCH_RP2040) || defined(ARDUINO_ARCH_RP2040)
    COBSUSBSerial(SerialUSB* _usbcdc);
    #elif defined(ARDUINO_TEENSY41) || defined(ARDUINO_TEENSY40)
    COBSUSBSerial(usb_serial_class* _usbcdc);
    #else
    COBSUSBSerial(Serial_* _usbcdc);
    #endif 
    void begin(void);
    void loop(void);
    // check & read,
    boolean clearToRead(void);
    size_t getPacket(uint8_t* dest);
    // clear ahead?
    boolean clearToSend(void);
    // open at all?
    boolean isOpen(void);
    // transmit a packet of this length 
    void send(uint8_t* packet, size_t len);
  private: 
    #if defined(ARDUINO_ARCH_RP2040) || defined(ARDUINO_ARCH_RP2040)
    SerialUSB* usbcdc = nullptr;
    #elif defined(ARDUINO_TEENSY41) || defined(ARDUINO_TEENSY40)
    usb_serial_class* usbcdc = nullptr;
    #else 
    Serial_* usbcdc = nullptr;
    #endif 
    // buffer, write pointer, length, 
    uint8_t rxBuffer[255];
    uint8_t rxBufferWp = 0;
    uint8_t rxBufferLen = 0;
    // ibid, 
    uint8_t txBuffer[255];
    uint8_t txBufferRp = 0;
    uint8_t txBufferLen = 0;
};