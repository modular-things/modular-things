// opapjs/utils/keys.ts
// network enums, basically 

// byte-keys and utes that belong to the transport layer 
let TransportKeys = {
  // forwarding ops 
  LINKF: 12,
  BUSF: 14,
  // port-to-port message key 
  PORTPACK: 33,
  // graph traverse codes 
  RUNTIMEINFO_REQ: 101,
  RUNTIMEINFO_RES: 102,
  // port info, link info and bus-state info:
  PORTINFO_REQ: 103, 
  PORTINFO_RES: 104,
  LGATEWAYINFO_REQ: 105,
  LGATEWAYINFO_RES: 106,
  BGATEWAYINFO_REQ: 107,
  BGATEWAYINFO_RES: 108,
  // ute, 
  getIncrement: function (key: number): number {
    switch (key) {
      case TransportKeys.LINKF:
        return 3;
      // TODO: do we actually need this ute ever for PORTPACK, or other end-of-line keys ?
      case TransportKeys.PORTPACK:
      case TransportKeys.BUSF:
        return 5;
      // case TransportKeys.RUNTIMEINFO_REQ:
      // case TransportKeys.RUNTIMEINFO_RES:
      // case TransportKeys.LINKSTATE_REQ:
      // case TransportKeys.LINKSTATE_RES:
      // case TransportKeys.BUSSTATE_REQ:
      // case TransportKeys.BUSSTATE_RES:
      //   return -1;
      default:
        throw new Error(`at TransportKeys.getIncrement, key is nonsense`)
    }
  }
}

// encodes runtime-type into RuntimeInfo packets
let BuildTypeKeys = {
  EmbeddedCPP: 50,
  JavaScript: 51,
  Python: 52,
  MicroPython: 53,
}

// encodes port-type into PortInfo packets
let PortTypeKeys = {
  NULL: 0,
  Naked: 1,
  Named: 2,
  DeviceNames: 3,
  DeviceNameManager: 4,
  Dispatcher: 5,
  FancyNameManager: 6,
  MessageEscape: 7,
  MessageEscapeListener: 8,
  OnePipe: 9, 
  OnePipeListener: 10,
}

// encodes gateway-type into LGateInfo packets
let LGatewayTypeKeys = {
  NULL: 0, 
  Unknown: 1,
  USBSerial: 2,
  UART: 3,
}

// it's often useful to exchange nums-for-strings, here's a ute for that:
let keyToString = (k: number, basis: any): string => {
  type types = keyof typeof basis;
  for(let key of Object.keys(basis)){
    if (basis[key as types] == k) {
      return key;
    }
  }
  return 'unknown';
}

export { 
  TransportKeys, 
  BuildTypeKeys, 
  PortTypeKeys, 
  LGatewayTypeKeys, 
  keyToString
}