/*
vPortSerial.js

link layer 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { SerialPort, DelimiterParser } from 'serialport'
import { TS } from '../core/ts.js'
import TIME from '../core/time.js'
import COBS from "../utes/cobs.js"

// have some "protocol" at the link layer 
// buffer is max 256 long for that sweet sweet uint8_t alignment 
let SERLINK_BUFSIZE = 255
// -1 checksum, -1 packet id, -1 packet type, -2 cobs
let SERLINK_SEGSIZE = SERLINK_BUFSIZE - 5
// packet keys; 
let SERLINK_KEY_PCK = 170  // 0b10101010
let SERLINK_KEY_ACK = 171  // 0b10101011
let SERLINK_KEY_DBG = 172
let SERLINK_KEY_KEEPALIVE = 173 // keepalive ping 
// retry settings 
let SERLINK_RETRY_MACOUNT = 2
let SERLINK_RETRY_TIME = 100  // milliseconds  
let SERLINK_KEEPALIVE_TX_TIME = 800 // ms, dead-time interval before sending an 'i'm-still-here' ping 
let SERLINK_KEEPALIVE_RX_TIME = 1200 // ms, dead-time interval before assuming neighbour is dead 

export default function VPortSerial(osap, portName, debug = false) {
  // track la, 
  this.portName = portName
  // make the vport object (will auto attach to osap)
  let vport = osap.vPort(`vport_${this.portName}`)
  vport.maxSegLength = 255
  // open the port itself, 
  if (debug) console.log(`SERPORT contact at ${this.portName}, opening`)
  // we keep a little state, as a treat 
  let outAwaiting = null
  let outAwaitingId = 1
  let outAwaitingTimer = null
  let numRetries = 0
  let lastIdRxd = 0
  let lastRxTime = 0 // last time we heard back ? for keepalive 
  // flowcontrol is based on this state, 
  this.status = "opening"
  let flowCondition = () => {
    return (outAwaiting == null)
  }
  // we report flowcondition, 
  vport.cts = () => { return (this.status == "open" && flowCondition()) }
  // and open / closed-ness, 
  vport.isOpen = () => { return (this.status == "open" && (TIME.getTimeStamp() - lastRxTime) < SERLINK_KEEPALIVE_RX_TIME) }
  // we have a port... 
  let port = new SerialPort({
    path: this.portName,
    baudRate: 9600
  })
  port.on('open', () => {
    // we track remote open spaces, this is stateful per link... 
    console.log(`SERPORT at ${this.portName} OPEN`)
    // is now open,
    this.status = "open"
    // we do some keepalive, 
    let keepAliveTimer = null
    // we can manually write this, 
    let keepAlivePacket = new Uint8Array([3, SERLINK_KEY_KEEPALIVE, 0])
    // clear current keepAlive timer and set new one, 
    let keepAliveTxUpdate = () => {
      if (keepAliveTimer) { clearTimeout(keepAliveTimer) }
      keepAliveTimer = setTimeout(() => {
        port.write(keepAlivePacket)
        keepAliveTxUpdate()
      }, SERLINK_KEEPALIVE_TX_TIME)
    }
    // also set last-rx to now, and init keepalive state, 
    lastRxTime = TIME.getTimeStamp()
    keepAliveTxUpdate()
    // to get, use delimiter
    let parser = port.pipe(new DelimiterParser({ delimiter: [0] }))
    //let parser = port.pipe(new ByteLength({ length: 1 }))
    // implement rx
    parser.on('data', (buf) => {
      lastRxTime = TIME.getTimeStamp()
      if (debug) console.log('SERPORT Rx', buf)
      // checksum... 
      if (buf.length + 1 != buf[0]) {
        console.log(`SERPORT Rx Bad Checksum, ${buf[0]} reported, ${buf.length} received`)
        return
      }
      // ack / pack: check and clear, or noop 
      switch (buf[1]) {
        case SERLINK_KEY_ACK:
          if (buf[2] == outAwaitingId) outAwaiting = null;
          break;
        case SERLINK_KEY_PCK:
          if (buf[2] == lastIdRxd) {
            console.log(`SERPORT Rx double id ${buf[2]}`)
            return
          } else {
            lastIdRxd = buf[2]
            let decoded = COBS.decode(buf.slice(3))
            vport.awaitStackAvailableSpace(0, 2000).then(() => {
              //console.log('SERPORT RX Decoded', decoded)
              vport.receive(decoded)
              // output an ack, 
              let ack = new Uint8Array(4)
              ack[0] = 4
              ack[1] = SERLINK_KEY_ACK
              ack[2] = lastIdRxd
              ack[3] = 0
              port.write(ack)
            })
          }
          break;
        case SERLINK_KEY_DBG:
          {
            let decoded = COBS.decode(buf.slice(2))
            let str = TS.read('string', decoded, 0, true).value; console.log("LL: ", str)
          }
          break;
        case SERLINK_KEY_KEEPALIVE:
          // this is just for updating lastRxTime... 
          break;
        default:
          console.error(`SERPORT Rx unknown front-key ${buf[1]}`)
          break;
      }
    })
    // implement tx
    vport.send = (buffer) => {
      // double guard, idk
      if (!flowCondition()) return;
      // buffers, uint8arrays, all the same afaik 
      // we are len + cobs start + cobs delimit + pck/ack + id + checksum ? 
      outAwaiting = new Uint8Array(buffer.length + 5)
      outAwaiting[0] = buffer.length + 5
      outAwaiting[1] = SERLINK_KEY_PCK
      outAwaitingId++; if (outAwaitingId > 255) outAwaitingId = 1;
      outAwaiting[2] = outAwaitingId
      outAwaiting.set(COBS.encode(buffer), 3)
      // reset retry states 
      clearTimeout(outAwaitingTimer)
      numRetries = 0
      // ship eeeet 
      if (debug) console.log('SERPORT Tx', outAwaiting)
      port.write(outAwaiting)
      keepAliveTxUpdate()
      // retry timeout, in reality USB is robust enough, but codes sometimes bungle messages too 
      outAwaitingTimer = setTimeout(() => {
        if (outAwaiting && numRetries < SERLINK_RETRY_MACOUNT && port.isOpen) {
          port.write(outAwaiting)
          keepAliveTxUpdate()
          numRetries++
        } else if (!outAwaiting) {
          // noop
        } else {
          // cancel 
          outAwaiting = null
        }
      }, SERLINK_RETRY_TIME)
    }
  }) // end on-open
  // close on errors, 
  port.on('error', (err) => {
    this.status = "closing"
    console.log(`SERPORT ${this.portName} ERR`, err)
    if (port.isOpen) port.close()
  })
  port.on('close', (evt) => {
    vport.dissolve()
    console.log(`SERPORT ${this.portName} closed`)
    this.status = "closed"
  })
}