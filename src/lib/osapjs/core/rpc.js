/*
rpc.js

build local copies of remote functions 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS, VT, EP, VBUS, RT, RPC } from './ts.js'
import TIME from './time.js'
import PK from './packets.js'

export default function RPCTools(osap) {
  // call id genny 
  let runningCallID = 33
  let getNewCallID = () => {
    runningCallID++
    runningCallID = runningCallID & 0b11111111
    return runningCallID
  }
  let callsAwaiting = []
  // build a new rpc func w/ given info... 
  this.rollup = (info) => {
    // we need to build TS.keyToLen and TS.keyToString... then it should work, or sth ? 
    let argLen = info.argSize // TS.keyToLen(info.argKey)
    let func = async (arg) => {
      try {
        // watch for bad calls... like, we have to type check here ? 
        await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
        // we're going to send some data downstream, w/ the appropriate header:
        let id = getNewCallID()
        let payload = new Uint8Array(argLen + 3)
        payload[0] = PK.DEST
        payload[1] = RPC.CALL_REQ
        payload[2] = id
        // we'll be writing multiples... 
        for(let a = 0; a < info.argLen; a ++){
          TS.write(TS.keyToString(info.argKey), arg[a], payload, 3 + a * (info.argSize / info.argLen))
        }
        // TS.write(TS.keyToString(info.argKey), arg, payload, 3)
        console.warn(`payload with ${arg} as `, payload)
        let datagram = PK.writeDatagram(info.route, payload)
        // aaand we can ship it, then await ?
        osap.handle(datagram, VT.STACK_ORIGIN)
        return new Promise((resolve, reject) => {
          let timeout = setTimeout(() => {
            reject(`fn call to ${info.name} timed out after 1000ms`)
          }, 1000)
          callsAwaiting.push({
            id: id,
            onResponse: function (data) {
              clearTimeout(timeout)
              if(info.retLen > 1){
                let retVals = []
                for(let r = 0; r < info.retLen; r ++){
                  retVals.push(TS.read(TS.keyToString(info.retKey), data, r * (info.retSize / info.retLen)))
                }
                console.warn(`resolving multiples, `, retVals)
                resolve(retVals)
              } else {
                resolve(TS.read(TS.keyToString(info.retKey), data, 0))
              }
            }
          })
        })
      } catch (err) {
        throw err
      }
    }
    return func
  }
  // resolve past calls 
  this.destHandler = (item, ptr) => {
    // just handling the one type for now, 
    if (item.data[ptr + 2] != RPC.CALL_RES) {
      throw new Error(`strange key ${item.data[ptr + 2]} delivered to RPCTools destHandler`)
    }
    // carry on... 
    let callId = item.data[ptr + 3]
    for (let cl in callsAwaiting) {
      if (callsAwaiting[cl].id == callId) {
        callsAwaiting[cl].onResponse(new Uint8Array(item.data.subarray(ptr + 4)))
        callsAwaiting.splice(cl, 1)
        return
      }
    }
    // if we got up to this point, we probably have a double rx or sth ?
    console.warn(`recvd rpc response ${callId}, but no matching call awaiting... of ${callsAwaiting.length}`)
  }
}