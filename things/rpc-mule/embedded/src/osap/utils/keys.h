// keys 

#ifndef KEYS_H_
#define KEYS_H_

#include <Arduino.h>

// transport layer keys 

// for transport
#define TKEY_LINKF 12
#define TKEY_BUSF 14 
#define TKEY_PORTPACK 33 

// for runtime info 
#define TKEY_RUNTIMEINFO_REQ 101
#define TKEY_RUNTIMEINFO_RES 102 
// port info (type maps) 
#define TKEY_PORTINFO_REQ 103
#define TKEY_PORTINFO_RES 104
// gateway info (type, state maps) 
#define TKEY_LGATEWAYINFO_REQ 105
#define TKEY_LGATEWAYINFO_RES 106 
#define TKEY_BGATEWAYINFO_REQ 107
#define TKEY_BGATEWAYINFO_RES 108 

// transport layer increments 

#define TKEY_LINKF_INC 3 
#define TKEY_BUSF_INC 5 

// build type keys 

#define BTYPEKEY_EMBEDDED_CPP 50
#define BTYPEKEY_JAVASCRIPT 51
#define BTYPEKEY_PYTHON 52
#define BTYPEKEY_MICROPYTHON 53

// port type keys

#define PTYPEKEY_NULL 0 
#define PTYPEKEY_NAKED 1 
#define PTYPEKEY_NAMED 2 
#define PTYPEKEY_DEVICENAMES 3
#define PTYPEKEY_DEVICENAMEMANAGER 4 
#define PTYPEKEY_DISPATCHER 5
#define PTYPEKEY_FANCYNAMEMANAGER 6
#define PTYPEKEY_MESSAGE_ESCAPE 7
#define PTYPEKEY_MESSAGE_ESCAPE_LISTENER 8 
#define PTYPEKEY_ONE_PIPE 9 
#define PTYPEKEY_ONE_PIPE_LISTENER 10 

// link-gateway type keys:

#define LGATEWAYTYPEKEY_NULL 0 
#define LGATEWAYTYPEKEY_UNKNOWN 1
#define LGATEWAYTYPEKEY_USBSERIAL 2 
#define LGATEWAYTYPEKEY_UART 3

#endif 