/*
packets.js / PK 

packet writing for OSAP 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS } from './ts.js'

// diff like... 
// packet keys, for l0 of packets,
// PKEYS all need to be on the same byte order, since they're 
// walked
// TRANSPORT LAYER
let PK = {
  PTR: 240,         // packet pointer (next byte is instruction)
  DEST: 224,        // have arrived, (next bytes are for recipient)
  PINGREQ: 192,     // hit me back 
  PINGRES: 176,     // here's ur ping 
  SCOPEREQ: 160,    // requesting scope info @ this location 
  SCOPERES: 144,    // replying to your scope request, 
  SIB: 16,          // sibling fwds,
  PARENT: 32,       // parent fwds, 
  CHILD: 48,        // child fwds, 
  PFWD: 64,         // forward at this port, to port's partner 
  BFWD: 80,         // fwd at this bus, to <arg> indice 
  BBRD: 96,         // broadcast here, to <arg> channel 
  LLESCAPE: 112,    // pls escape this string-formatted message... 
}

PK.logPacket = (data, routeOnly = false, trace = true) => {
  // uint8array-only club, 
  if (!(data instanceof Uint8Array)) {
    console.warn(`attempt to log non-uint8array packet, bailing`)
    console.warn(data)
    return
  }
  // write an output msg, 
  let msg = ``
  msg += `PKT: \n`
  let startByte = 4
  if (routeOnly) {
    startByte = 0
  } else {
    // alright 1st 4 bytes are TTL and segSize 
    msg += `timeToLive: ${TS.read16(data, 0)}\n`
    msg += `segSize: ${TS.read16(data, 2)}\n`
  }
  // now we have sets of instructions, 
  msgLoop: for (let i = startByte; i < data.length; i += 2) {
    switch (PK.readKey(data, i)) {
      case PK.PTR:
        msg += `[${data[i]}] PTR ---------------- v\n`
        i--;
        break;
      case PK.DEST:
        msg += `[${data[i]}] DEST, DATA LEN: ${data.length - i}`
        while(i < data.length){
          i ++ 
          msg += `\n[${data[i]}]`
        }
        break msgLoop;
      case PK.PINGREQ:
        msg += `[${data[i]}], [${data[i + 1]}] PING REQUEST: ID: ${PK.readArg(data, i)}`;
        break msgLoop;
      case PK.PINGRES:
        msg += `[${data[i]}], [${data[i + 1]}] PING RESPONSE: ID: ${PK.readArg(data, i)}`
        break msgLoop;
      case PK.SCOPEREQ:
        msg += `[${data[i]}], [${data[i + 1]}] SCOPE REQUEST: ID: ${PK.readArg(data, i)}`
        break msgLoop;
      case PK.SCOPERES:
        msg += `[${data[i]}], [${data[i + 1]}] SCOPE RESPONSE: ID: ${PK.readArg(data, i)}`
        break msgLoop;
      case PK.SIB:
        msg += `[${data[i]}], [${data[i + 1]}] SIB FWD: IND: ${PK.readArg(data, i)}\n`
        break;
      case PK.PARENT:
        msg += `[${data[i]}], [${data[i + 1]}] PARENT FWD: IND: ${PK.readArg(data, i)}\n`
        break;
      case PK.CHILD:
        msg += `[${data[i]}], [${data[i + 1]}] CHILD FWD: IND: ${PK.readArg(data, i)}\n`
        break;
      case PK.PFWD:
        msg += `[${data[i]}], [${data[i + 1]}] PORT FWD: IND: ${PK.readArg(data, i)}\n`
        break;
      case PK.BFWD:
        msg += `[${data[i]}], [${data[i + 1]}] BUS FWD: RXADDR: ${PK.readArg(data, i)}\n`
        break;
      case PK.BBRD:
        msg += `[${data[i]}], [${data[i + 1]}] BUS BROADCAST: CHANNEL: ${PK.readArg(data, i)}\n`
        break;
      case PK.LLESCAPE:
        msg += `[${data[i]}] LL ESCAPE, STRING LEN: ${data.length - i}`
        break msgLoop;
      default:
        msg += "BROKEN"
        break msgLoop;
    }
  } // end of loop-thru, 
  console.log(msg)
  if(trace) console.trace()
}

PK.logRoute = (route, trace = true) => {
  let pckt = PK.writeDatagram(route, new Uint8Array(0))
  PK.logPacket(pckt, false, trace)
}

// idiosyncrasy related to old-style vm route-building vs... new-style route-searching algos...
PK.VC2VMRoute = (route) => {
  // we can't do this to caller's route object, so we make a copy, 
  route = PK.route(route).end()
  // i.e. search routines return paths from browser-root node, to the root node in the remote 
  // object... but vms are written to go from a *child* of the browser root node, to *children* in the remote...
  // departing from a sibling, not the parent... 
  route.path[1] = PK.SIB
  // and not going *up* to the parent, once traversing into the context... 
  route.path = new Uint8Array(route.path.subarray(0, route.path.length - 2))
  return route 
}

PK.VC2EPRoute = (route) => {
  // we can't do this to caller's route object, so we make a copy, 
  route = PK.route(route).end()
  // i.e. search routines return paths from browser-root node, to the root node in the remote 
  // object... but vms are written to go from a *child* of the browser root node, to *children* in the remote...
  // departing from a sibling, not the parent... 
  route.path[1] = PK.SIB
  // that's it for these, 
  return route 
}

PK.route = (existing) => {
  // start w/ a temp uint8 array, 
  let path = new Uint8Array(256)
  let wptr = 0
  // copy-in existing path, if starting from some root, 
  if (existing != null && existing.path != undefined) {
    path.set(existing.path, 0)
    wptr = existing.path.length
  } else {
    path[wptr++] = PK.PTR
  }
  // add & return this, to chain... 
  return {
    sib: function (indice) {
      indice = parseInt(indice)
      PK.writeKeyArgPair(path, wptr, PK.SIB, indice)
      wptr += 2
      return this
    },
    parent: function () {
      PK.writeKeyArgPair(path, wptr, PK.PARENT, 0)
      wptr += 2
      return this
    },
    child: function (indice) {
      indice = parseInt(indice)
      PK.writeKeyArgPair(path, wptr, PK.CHILD, indice)
      wptr += 2
      return this
    },
    pfwd: function () {
      PK.writeKeyArgPair(path, wptr, PK.PFWD, 0)
      wptr += 2
      return this
    },
    bfwd: function (indice) {
      indice = parseInt(indice)
      PK.writeKeyArgPair(path, wptr, PK.BFWD, indice)
      wptr += 2
      return this
    },
    bbrd: function (channel) {
      channel = parseInt(channel)
      PK.writeKeyArgPair(path, wptr, PK.BBRD, channel)
      wptr += 2
      return this
    },
    end: function (ttl, segSize, noOpt = false) {
      // we want to absorb ttl & segSize from existing if it was used, 
      // but also *not* of ttl and segSize are used here, 
      if(existing != null && existing.ttl && existing.segSize){
        ttl = existing.ttl
        segSize = existing.segSize
      } else {
        ttl = 1000
        segSize = 128 
      }
      // we also want to abbreviate the non-optimal parent().child() pattern 
      // that emerges during sweeps / etc, 
      if(!noOpt){
        for(let ptr = 1; ptr < path.length - 4; ptr += 2){
          if(PK.readKey(path, ptr) == PK.PARENT && PK.readKey(path, ptr + 2) == PK.CHILD){
            // console.log(`found non-opt at ${ptr}`, JSON.parse(JSON.stringify(path.subarray(ptr, ptr + 4))))
            // child arg = sib arg, 
            let sibIndice = PK.readArg(path, ptr + 2)
            // console.log(`sib is ${sibIndice}`)
            // insert, 
            PK.writeKeyArgPair(path, ptr, PK.SIB, sibIndice)
            // path is uint8array, so we have to shift back like so... 
            wptr -= 2
            for(let i = ptr + 2; i < wptr; i ++){
              path[i] = path[i + 2]
            }
          }
        }
      }
      // return a path object, 
      return {
        ttl: ttl, 
        segSize: segSize,
        path: new Uint8Array(path.subarray(0, wptr)),
      }
    }
  }
}

// match on route objects, 
PK.routeMatch = (ra, rb) => {
  if(ra.path.length != rb.path.length) return false; 
  for(let i = 0; i < ra.path.length; i ++){
    if(ra.path[i] != rb.path[i]) return false;
  }
  return true
}

// where route = { ttl: <num>, segSize: <num>, path: <uint8array> }
PK.writeDatagram = (route, payload) => {
  let datagram = new Uint8Array(route.path.length + payload.length + 4)
  TS.write('uint16', route.ttl, datagram, 0)
  TS.write('uint16', route.segSize, datagram, 2)
  datagram.set(route.path, 4)
  datagram.set(payload, 4 + route.path.length)
  if(datagram.length > route.segSize) throw new Error(`writing datagram of len ${datagram.length} w/ segSize setting ${segSize}`);
  return datagram
}

PK.writeReply = (ogPck, payload) => {
  // find the pointer, 
  let ptr = PK.findPtr(ogPck)
  if (!ptr) throw new Error(`during reply-write, couldn't find the pointer...`);
  // our new datagram will be this long (ptr is location of ptr, len is there + 1) + the payload length, so 
  let datagram = new Uint8Array(ptr + 1 + payload.length)
  // we're using the OG ttl and segsize, so we can just write that in, 
  datagram.set(ogPck.subarray(0, 4))
  // and also write in the payload, which will come after the ptr's current position, 
  datagram.set(payload, ptr + 1)
  // now we want to do the walk-to-ptr, reversing... 
  // we write at the head of the packet, whose first byte is the pointer, 
  let wptr = 4
  datagram[wptr++] = PK.PTR
  // don't write past here, 
  let end = ptr 
  // read from the back, 
  let rptr = ptr
  walker: for (let h = 0; h < 16; h++) {
    if(wptr >= end) break walker;
    rptr -= 2
    switch (PK.readKey(ogPck, rptr)) {
      case PK.SIB:
      case PK.PARENT:
      case PK.CHILD:
      case PK.PFWD:
      case PK.BFWD:
      case PK.BBRD:
        // actually we can do the same action for each of these keys, 
        datagram.set(ogPck.subarray(rptr, rptr + 2), wptr)
        wptr += 2
        break;
      default:
        throw new Error(`during writeReply route reversal, encountered unpredictable key ${ogPck[rptr]}`)
    }
  }
  // that's it, 
  return datagram
}

// returns the position of the ptr key such that pck[ptr] == PK.PTR, or undefined 
PK.findPtr = (pck) => {
  // 1st position the ptr can be in is 4, 
  let ptr = 4
  // search fwd for a max of 16 steps, 
  for (let h = 0; h < 16; h++) {
    switch (PK.readKey(pck, ptr)) {
      case PK.PTR:    // it's the ptr, return it
        return ptr
      case PK.SIB:    // keys which could be between start of pckt and terminal, 
      case PK.PARENT:
      case PK.CHILD:
      case PK.PFWD:
      case PK.BFWD:
      case PK.BBRD:
        ptr += 2
        break;
      default:        // anything else means a broken packet, 
        return undefined
    }
  }
}

// walks the ptr ahead by n steps, putting reversed instructions behind, 
PK.walkPtr = (pck, ptr, source, steps) => {
  // check check... 
  if (pck[ptr] != PK.PTR) { throw new Error(`bad ptr walk, pck[ptr] == ${pck[ptr]} not PK.PTR`) }
  // walk along, switching on instructions... 
  for (let h = 0; h < steps; h++) {
    switch (PK.readKey(pck, ptr + 1)) {
      case PK.SIB: {
          // stash indice of from-whence it came, 
          let txIndice = source.indice 
          // track for this loop's next step, before we modify the packet data
          source = source.parent.children[PK.readArg(pck, ptr + 1)]
          // so, where ptr is currently goes the new key / arg pair for a reversal, 
          // for a sibling pass, that's the sibling to pass back to, 
          PK.writeKeyArgPair(pck, ptr, PK.SIB, txIndice)
          // then the position +2 from current ptr becomes the ptr, now it's just behind the next instruction, 
          pck[ptr + 2] = PK.PTR
          ptr += 2
        }
        break;
      case PK.PARENT:
        // reversal for a 'parent' instruction is to go back to the child, 
        PK.writeKeyArgPair(pck, ptr, PK.CHILD, source.indice)
        pck[ptr + 2] = PK.PTR
        // next source... 
        source = source.parent
        ptr += 2
        break;
      case PK.CHILD:
        // next src will be 
        source = source.children[PK.readArg(pck, ptr + 1)]
        // reversal for a 'child' instruction is to go back to the parent, 
        PK.writeKeyArgPair(pck, ptr, PK.PARENT, 0)
        pck[ptr + 2] = PK.PTR
        ptr += 2
        break;
      case PK.PFWD:
        // reversal for a pfwd is just a pointer hop, 
        PK.writeKeyArgPair(pck, ptr, PK.PFWD, 0)
        pck[ptr + 2] = PK.PTR
        // PFWD is a network instruction, we should only ever be ptr-walking once in this case, 
        if (steps != 1) throw new Error(`likely bad call to walkPtr, we have port-fwd here w/ more than 1 step`)
        return;
      case PK.BFWD:
      case PK.BBRD:
        throw new Error(`bus instructions in JS, badness`)
        break;
      case PK.PTR:    // this doesn't make any sense, we had pck[ptr] = PK.PTR, and are here at pck[ptr + 1]
      default:        // anything else means a broken instruction, 
        throw new Error(`out of place keys during a pointer increment`)
    }
  }
}

PK.readKey = (data, start) => {
  return data[start] & 0b11110000
}

// we use strange-endianness for arguments, 
PK.readArg = (data, start) => {
  return ((data[start] & 0b00001111) << 8) | data[start + 1]
}

PK.writeKeyArgPair = (data, start, key, arg) => {
  data[start] = key | (0b00001111 & (arg >> 8))
  data[start + 1] = arg & 0b11111111
}

export default PK 