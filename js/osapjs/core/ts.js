/*
ts.js // typeset

serialization & keys for OSAP

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

// vertex types & keys 
let VT = {
  ROOT: 22,
  MODULE: 23,
  ENDPOINT: 24,
  QUERY: 25,
  VPORT: 44,
  VBUS: 45,
  STACK_ORIGIN: 0,
  STACK_DEST: 1
}

VT.defaultStackSize = 6

// endpoint layer types & keys 
let EP = {
  SS_ACK: 101,      // the ack, 
  SS_ACKLESS: 121,  // ackless transmit 
  SS_ACKED: 122,    // transmit requests ack 
  QUERY: 131,       // query for current data 
  QUERY_RES: 132,  // query response 
  ROUTE_QUERY_REQ: 141, // request route list 
  ROUTE_QUERY_RES: 142,  // route list, 
  ROUTE_SET_REQ: 143,    // req-to-add-route 
  ROUTE_SET_RES: 144,
  ROUTE_RM_REQ: 147,
  ROUTE_RM_RES: 148,
  ROUTEMODE_ACKED: 167,
  ROUTEMODE_ACKLESS: 168,
}

// vbus layer keys 
let VBUS =  {
  BROADCAST_MAP_REQ: 145,
  BROADCAST_MAP_RES: 146,
  BROADCAST_QUERY_REQ: 141,
  BROADCAST_QUERY_RES: 142,
  BROADCAST_SET_REQ: 143,
  BROADCAST_SET_RES: 144,
  BROADCAST_RM_REQ: 147,
  BROADCAST_RM_RES: 148 
}

// root layer keys 
let RT = {
  DBG_STAT: 151,
  DBG_ERRMSG: 152,
  DBG_DBGMSG: 153,
  DBG_RES: 161,
  RENAME_REQ: 171,
  RENAME_RES: 172
}

let EPMSEG = {
  QUERY: 141,
  QUERY_RES: 142,
  QUERY_END_RESP: 143
}

// the 'typeset' 
let TS = {}

// just shorthands, 
TS.read16 = (data, start) => {
  return TS.read('int16', data, start)
}

TS.write16 = (value, data, start) => {
  TS.write('uint16', value, data, start)
}

let decoder = new TextDecoder()
// let tempRead = {} 

TS.read = (type, data, start) => {
  // uint8array-only club, 
  if (!(data instanceof Uint8Array)) {
    console.warn(`attempt to read from non-uint8array data, bailing`)
    console.warn(data)
    return
  }
  // read it... 
  switch (type) {
    case 'int32':
      return new Int32Array(data.buffer.slice(start, start + 4))[0]
    case 'uint8':
      return new Uint8Array(data.buffer.slice(start, start + 1))[0]
    case 'int16':
      return new Int16Array(data.buffer.slice(start, start + 2))[0]
    case 'uint16':
      return new Uint16Array(data.buffer.slice(start, start + 2))[0]
    case 'uint32':
      return new Uint32Array(data.buffer.slice(start, start + 4))[0]
    case 'float32':
      return new Float32Array(data.buffer.slice(start, start + 4))[0]
    case 'boolean':
      if (data[start] > 0) {
        return true
      } else {
        return false
      }
      break;
    case 'string':
      let length = (data[start] & 255) | (data[start + 1] << 8) | (data[start + 2] << 16) | (data[start + 3] << 24)
      let pckSlice = data.buffer.slice(start + 4, start + 4 + length)
      return {
        value: decoder.decode(pckSlice),
        inc: length + 4
      }
    default:
      console.error('no code for this type read')
      return null
      break;
  }
}

let encoder = new TextEncoder()
let tempArr = {}
let tempBytes = {}

TS.write = (type, value, data, start) => {
  // uint8arrays-only club, 
  if (!(data instanceof Uint8Array)) {
    console.warn(`attempt to write into non-uint8array packet, bailing`)
    console.warn(data)
    return
  }
  // write types... 
  switch (type) {
    case 'uint8':
      data[start] = value & 255
      return 1
    case 'uint16':
      // little endian: lsb is at the lowest address
      data[start] = value & 255
      data[start + 1] = (value >> 8) & 255
      return 2
    case 'int32':
      tempArr = Int32Array.from([value])
      tempBytes = new Uint8Array(tempArr.buffer)
      data.set(tempBytes, start)
      return 4
    case 'uint32':
      data[start] = value & 255
      data[start + 1] = (value >> 8) & 255
      data[start + 2] = (value >> 16) & 255
      data[start + 3] = (value >> 24) & 255
      return 4
    case 'float32':
      tempArr = Float32Array.from([value])
      tempBytes = new Uint8Array(tempArr.buffer)
      data.set(tempBytes, start)
      return 4
    case 'char':
      //      console.log('char', value.charCodeAt(0))
      data[start] = value.charCodeAt(0)
      return 1
    case 'string': // so, would be good to send long strings (i.e. dirty old gcodes), so 32b base
      let stringStream = encoder.encode(value)
      //console.log("WRITING STRING", value)
      data[start] = stringStream.length & 255
      data[start + 1] = (stringStream.length >> 8) & 255
      data[start + 2] = (stringStream.length >> 16) & 255
      data[start + 3] = (stringStream.length >> 24) & 255
      data.set(stringStream, start + 4)
      // console.warn(`wrote a string ${value} from ${start}`, data)
      return 4 + stringStream.length
    case 'boolean':
      if (value) {
        data[start] = 1
      } else {
        data[start] = 0
      }
      return 1
    default:
      console.error('no code for this type write')
      return null
      break;
  }
}

export {
  TS,     // typeset 
  VT,     // object types 
  EP,     // endpoint keys 
  EPMSEG, // mseg endpoint keys,
  VBUS,   // vbus mvc keys 
  RT,     // root mvc keys 
}
