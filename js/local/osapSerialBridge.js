/*
osap-usb-bridge.js

osap bridge to firmwarelandia

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

// big s/o to https://github.com/standard-things/esm for allowing this
import OSAP from '../osapjs/core/osap.js'
import { TS } from '../osapjs/core/ts.js'
import PK from '../osapjs/core/packets.js'

import WSSPipe from './utes/wssPipe.js'
import VPortSerial from '../osapjs/vport/vPortSerial.js'

import { SerialPort } from 'serialport'
import TIME from '../osapjs/core/time.js'

// we include an osap object - a node
let osap = new OSAP("local-usb-bridge")
osap.description = "node featuring wss to client and usbserial cobs connection to hardware"

// -------------------------------------------------------- WSS VPort

let wssVPort = osap.vPort("wssVPort")   // 0

// a rescan endpoint 

let rescanEndpoint = osap.endpoint("nodeRescan")
rescanEndpoint.addRoute(PK.route().sib(0).pfwd().sib(1).end())

// then resolves with the connected webSocketServer to us 
let LOGWSSPHY = false 
wssVPort.maxSegLength = 16384
let wssVPortStatus = "opening"
// here we attach the "clear to send" function,
// in this case we aren't going to flowcontrol anything, js buffers are infinite
// and also impossible to inspect  
wssVPort.cts = () => { return (wssVPortStatus == "open") }
// we also have isOpen, similarely simple here, 
wssVPort.isOpen = () => { return (wssVPortStatus == "open") }

WSSPipe.start().then((ws) => {
  // no loop or init code, 
  // implement status 
  wssVPortStatus = "open"
  // implement rx,
  ws.onmessage = (msg) => {
    if (LOGWSSPHY) console.log('PHY WSS Recv')
    if (LOGWSSPHY) TS.logPacket(msg.data)
    wssVPort.receive(msg.data)
  }
  // implement transmit 
  wssVPort.send = (buffer) => {
    if (LOGWSSPHY) console.log('PHY WSS Send')
    if (LOGWSSPHY) PK.logPacket(buffer)
    ws.send(buffer)
  }
  // local to us, 
  ws.onerror = (err) => {
    wssVPortStatus = "closed"
    console.log('wss error', err)
  }
  ws.onclose = (evt) => {
    wssVPortStatus = "closed"
    // because this local script is remote-kicked,
    // we shutdown when the connection is gone
    console.log('wss closes, exiting')
    process.exit()
    // were this a standalone network node, this would not be true
  }
})

// -------------------------------------------------------- USB Serial VPort

// we'd like to periodically poke around and find new ports... 
// these are "product IDs" that belong to the circuits we would want to hook up... 
let pidCandidates = [
  '801E', '80CB', '8031', '80CD', '800B', '4557'
]
let activePorts = []
let portSweeper = () => {
  // console.log("sweeping...")
  SerialPort.list().then((ports) => {
    for(let port of ports){
      // console.log(port.productId)
      // if we have a match to our candidates, 
      let cand = pidCandidates.find(elem => elem == port.productId)
      // and we don't already have it in the list of actives, 
      if(cand && !activePorts.find(elem => elem.portName == port.path)){ 
        // we have a match, but haven't already opened this port, 
        console.log(`FOUND desired prt at ${port.path}, launching vport...`)
        activePorts.push(new VPortSerial(osap, port.path))
        console.log(activePorts)
        // should rescan when it's open, or just delay... 
        TIME.delay(250).then(() => {
          rescanEndpoint.write(new Uint8Array([1]), "ackless")
        })
      }
    }
    // also... check deadies, 
    for(let vp of activePorts){
      if(vp.status == "closed"){
        console.log(`CLOSED and rming ${vp.portName}`)
        console.log('at indice...', activePorts.findIndex(elem => elem == vp))
        activePorts.splice(activePorts.findIndex(elem => elem == vp), 1)
        console.log(activePorts)
        rescanEndpoint.write(new Uint8Array([1]), "ackless")
      }
    }
    // set a timeout, 
    setTimeout(portSweeper, 500)
  })
}

portSweeper()