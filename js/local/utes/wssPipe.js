/*
wssPipe.js

automated remote-wss-server,

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

// so, ideally this is something that *could* get bootstrapped, if we hook it to
// osap/local file, but could otherwise run standalone...
// to start, will write here, then wrap in some interface...

// need to know our own ip,
import os from 'os'
import WS from 'ws'
const WebSocketServer = WS.Server
//const os = require('os')
//const WebSocketServer = require('ws').Server

// find our addr,
let wsAddr = ''
// once we're listening, report our IP:
let ifaces = os.networkInterfaces()
// this just logs the processes IP's to the termina
Object.keys(ifaces).forEach(function(ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function(iface) {
    if ('IPv4' !== iface.family) { //} || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }
    if (alias >= 1) {
      console.log('ip: ' /*ifname + ':' + alias,*/ + iface.address) // + `:${port}`);
      // this single interface has multiple ipv4 addresses
      // console.log('serving at: ' ifname + ':' + alias + iface.address + `:${port}`);
    } else {
      console.log('ip: ' /*ifname + ':' + alias,*/ + iface.address) //+ `:${port}`);
      wsAddr = iface.address
      // this interface has only one ipv4 adress
      //console.log(ifname, iface.address);
    }
    ++alias;
  });
});

let wsPort = 4040
let errs = 0
let startWSS = () => {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port: wsPort }, () => {
      console.log(`OSAP-wss-addr: ws://${wsAddr}:${wsPort}`)
    })
    // each new connection gets a new socket,
    wss.on('connection', (ws) => {
      resolve(ws)
    })
    wss.on('error', (err) => {
      if (err.code == "EADDRINUSE") {
        console.log('ports in use, next...')
        wsPort++
        errs++
        if (errs > 12) {
          console.log('too many occupied ports, bailing')
          process.exit()
        } else {
          return(startWSS())
        }
      } else {
        console.log('exiting due to wss err', err)
        process.exit()
      }
    })
  })
}

export default {
  start: startWSS
}
