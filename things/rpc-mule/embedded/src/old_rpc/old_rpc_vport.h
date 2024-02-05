/*
osap/vt_rpc.h

remote procedure call for osap devices

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the osap project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

#include "osap_config.h"
#ifndef OSAP_BIG_DIRTY_RECONFIG 

#ifndef VT_RPC_H_
#define VT_RPC_H_

#include "core/vport.h"
#include "core/packets.h"
#include "osap.h"
#include "core/ts.h"
#include "core/ttypes.h"

// with return type, argument type...
template <typename RT, typename AT>
class RPCVPort : public VPort {
  public:
    // we stash a function pointer, to call,
    // since RT, AT match our function pointer direct, this works...
    RT (*funcPtr)(AT argVal) = nullptr;
    // an arg name
    char argName[VT_NAME_MAX_LEN];
    // we make type-things of the things... this is
    // a TT of a TTS in some cases... yikes ?
    TypeHelper<AT> argThing;
    TypeHelper<RT> retThing;
    // we for sure need to handle our own paquiats,
    void destHandler(VPacket* pck, uint16_t ptr) override {
      // pck->data[ptr] == PK_PTR, ptr + 1 == PK_DEST, ptr + 2 == EP_KEY, ptr + 3 = ID (if ack req.)
      switch(pck->data[ptr + 2]){
        case RPC_INFO_REQ:
          {
            // write our reply header: it's info-response w/ matching ID
            uint8_t id = pck->data[ptr + 3];
            uint16_t wptr = 0;
            payload[wptr ++] = PK_DEST;
            payload[wptr ++] = RPC_INFO_RES;
            payload[wptr ++] = id;

            // write in the typeKey and the size...
            payload[wptr ++] = argThing.getTypeKey(); // getTypeKey<AT>();//typeKeyAT.get();
            ts_writeUint16(argThing.getLen(), payload, &wptr);
            ts_writeUint16(argThing.getByteSize(), payload, &wptr);
            payload[wptr ++] = retThing.getTypeKey(); // getTypeKey<RT>(); //typeKeyRT.get();
            ts_writeUint16(retThing.getLen(), payload, &wptr);
            ts_writeUint16(retThing.getByteSize(), payload, &wptr);

            // write the string in, 
            ts_writeString(argName, payload, &wptr);

            // and ship that,
            uint16_t len = pk_writeReply_plsReplace(pck->data, datagram, VT_VPACKET_MAX_SIZE, payload, wptr);
            stack_loadPacket(pck, datagram, len);
          }
          break;
        case RPC_CALL_REQ:
          {
            // start writing reply header...
            uint8_t id = pck->data[ptr + 3];
            uint16_t wptr = 0;
            payload[wptr ++] = PK_DEST;
            payload[wptr ++] = RPC_CALL_RES;
            payload[wptr ++] = id;
            uint16_t rptr = ptr + 4; // a read pointer,

            // first, let's deserialize into the underyling-thing in the typehelper,
            argThing.deserialize(&(pck->data[rptr]), &rptr);
            // then we can call the function w/ that underlying,
            // and pump the return value into the return typehelper,
            retThing.setUnderlying(funcPtr(argThing.getUnderlying()));
            // and we can take that & serialize it back ito the reply-packet,
            retThing.serialize(&(payload[wptr]), &wptr);

            // aaand ship it ?
            uint16_t len = pk_writeReply_plsReplace(pck->data, datagram, VT_VPACKET_MAX_SIZE, payload, wptr);
            stack_loadPacket(pck, datagram, len);
          }
          break;
        default:
          OSAP::error("rpc keyless dest ?");
          stack_release(pck);
      } // end switch
    };
    // a constructor...
    RPCVPort(
      VPort* _parent,
      const char* _name,
      const char* _argName,
      RT (*_funcPtr)(AT _argVal)
    ) : VPort(_parent){
      // appending...
      strcpy(name, "rpc_");
      strncat(name, _name, VT_NAME_MAX_LEN - 5);
      // copy pasta argname, 
      strcpy(argName, _argName);
      // type self,
      type = VT_TYPE_RPC;
      // done for now,
      funcPtr = _funcPtr;
    }
};

// -------------------------------------------------------- ...

// skeleton of a new typeset ?
// we can have ... type-specific constructors, I believe?
// see... https://www.cprogramming.com/tutorial/template_specialization.html

// class TypeInterface {
//   public:
//     uint8_t key = 0;
//     virtual uint8_t getKey(void);
//     virtual void serialize(char* dest) = 0;
// };

// template <typename T>
// class TT : public TypeInterface {
// };
// template<>
// class TT<float> : public TypeInterface {
//   public:
//     uint8_t key = TK_FLOAT32;
// };

// // -------------------------------------------------------- RPC Interface ?

// class RPCInterface {
//   public:
//     size_t writeArgKeys(uint8_t* dest);
//     size_t writeReturnKeys(uint8_t* dest);
//     virtual size_t call(uint8_t* argSrc, uint8_t* retDest);
// }

// class RPCInterfaceTyped : public RPCInterface {

// }

// template <>
// class Likeness <int16_t> {
//   public:
//     uint8_t key = TK_INT16;
// };

// // could just template this,
// // then specialize the serialize & deserialize classes
// class TT_UInt16 {
//   public:
//     uint8_t key = TK_UINT16;
//     uint16_t stash = 0;
//     void serialize(uint8_t* dest, uint16_t maxLen); // these can both just memcpy
//     T deserialize(uint8_t* src);                    // ibid
// };

#endif
#endif 