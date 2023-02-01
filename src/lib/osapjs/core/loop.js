/*
loop.js

osap / runtime 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2021

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { VT } from "./ts.js"
import TIME from "./time.js"
import PK from './packets.js'

let LOGHANDLER = false
let LOGSWITCH = false
// sed default arg to log-or-not, or override at specific call... 
let LOGLOOP = (msg, pck = null, log = false) => {
  if (log) console.warn('LP: ' + msg)
  if (log && pck) PK.logPacket(pck)
}

let loopItems = []

// this should be called just once per cycle, from the root vertex, 
let osapLoop = (root) => {
  // time is now, 
  let now = TIME.getTimeStamp()
  // reset our list of items-to-handle, 
  loopItems = []
  // collect 'em recursively, 
  collectRecursor(root)
  // we want to pre-compute each items' time until death, this is handy in two places, 
  for (let item of loopItems) {
    item.timeToDeath = item.timeToLive - (now - item.arrivalTime)
  }
  // sort items by their time-to-live,
  loopItems.sort((a, b) => {
    // for the compare function, we return `> 0` if we want to sort a after b,
    // so we just want a's ttd - b's ttd, items which have more time until failure will 
    // be serviced *after* items whose life is on the line etc 
    return a.timeToDeath - b.timeToDeath
  })
  //console.warn(loopItems.length)
  // now we just go through each item, in order, and try to handle it...   
  for (let i = 0; i < loopItems.length; i++) {
    // handle 'em ! 
    osapItemHandler(loopItems[i])
  }
  // console.log(`handled ${loopItems.length}`)
  // that's the end of the loop, folks 
  // items which have gone unhandled will have issued requests for new loops, 
  // this will fire again on those cycles, 
}

let collectRecursor = (vt) => {
  // we want to collect items from input & output stacks alike, 
  for (let od = 0; od < 2; od++) {
    for (let i = 0; i < vt.stack[od].length; i++) {
      loopItems.push(vt.stack[od][i])
    }
  }
  // then collect our children's items...
  for (let child of vt.children) {
    collectRecursor(child)
  }
}

let osapItemHandler = (item) => {
  LOGLOOP(`handling at ${item.vt.name}`, item.data)
  // kill deadies, use 500ms javascript grace period
  if (item.timeToDeath < -500) {
    LOGLOOP(`LP: item at ${item.vt.name} times out, ttd ${item.timeToDeath}`, null, true)
    item.handled(); return
  }
  // find ptrs, 
  let ptr = PK.findPtr(item.data)
  if (ptr == undefined) {
    LOGLOOP(`item at ${item.vt.name} is ptr-less`, item.data, true)
    item.handled(); return
  }
  // now we can try to transport it, switching on the instruction (which is ahead)
  switch (PK.readKey(item.data, ptr + 1)) {
    // packet is at destination, send to vertex to handle, 
    // if handler returns true, OK to destroy packet, else wait on it 
    case PK.DEST:
      item.vt.destHandler(item, ptr)
      break;
    // reply to pings
    case PK.PINGREQ:
      item.vt.pingRequestHandler(item, ptr)
      break;
    // handle replies *from* pings, 
    case PK.PINGRES:
      item.vt.pingResponseHandler(item, ptr)
      break;
    // reply to scopes
    case PK.SCOPEREQ:
      item.vt.scopeRequestHandler(item, ptr)
      break;
    // handle replies *from* scopes 
    case PK.SCOPERES:
      item.vt.scopeResponseHandler(item, ptr)
      break;
    // do internal transport, 
    case PK.SIB:
    case PK.PARENT:
    case PK.CHILD:
      osapInternalTransport(item, ptr)
      break;
    // do port-forwarding transport, 
    case PK.PFWD:
      // only possible if vertex is a vport, 
      if (item.vt.type == VT.VPORT) {
        // and if it's clear to send, 
        if (item.vt.cts()) {
          LOGLOOP(`pfwd OK at ${item.vt.name}`)
          // walk the ptr 
          PK.walkPtr(item.data, ptr, item.vt, 1)
          // send it... if we were to operate total-packet-ttl, we would also  
          // decriment the packet's ttl counter, but at the time of writing (2022-06-17) 
          // we are operating on per-hop ttl, 
          item.vt.send(item.data)
          item.handled()
        } else {
          LOGLOOP(`pfwd hold, not CTS at ${item.vt.name}`);
          item.vt.requestLoopCycle()
        }
      } else {
        LOGLOOP(`pfwd at non-vport, ${item.vt.name} is type ${item.vt.type}`, item.data, true)
        item.handled()
      }
      break;
    case PK.BFWD:
    case PK.BBRD:
      LOGLOOP(`bus transport request in JS, at ${item.vt.name}`, item.data, true)
      break;
    case PK.LLESCAPE:
      LOGLOOP(`low level escape msg from ${item.vt.name}`, null, true)
      break;
    default:
      LOGLOOP(`LP: item at ${item.vt.name} has unknown packet key after ptr, bailing`, item.data, true)
      item.handled()
      break;
  } // end item switch, 
}

// here we want to look thru potentially multi-hop internal moves & operate that transport... 
// i.e. we want to tunnel straight thru multiple steps, using the DAG as an addressing space 
// but not necessarily transport space 
let osapInternalTransport = (item, ptr) => {
  try {
    // starting at the items' vertice... 
    let vt = item.vt
    // new ptr to walk fwds, 
    let fwdPtr = ptr + 1
    // count # of ops, 
    let opCount = 0
    // loop thru internal ops until we hit a destination of a forwarding step, 
    fwdSweep: for (let h = 0; h < 16; h++) {
      LOGLOOP(`fwd look from ${vt.name}, ptr ${fwdPtr} key ${item.data[fwdPtr]}`)
      switch (PK.readKey(item.data, fwdPtr)) {
        // these are the internal transport cases: across, up, or down the tree 
        case PK.SIB:
          LOGLOOP(`instruction is sib, ${PK.readArg(item.data, fwdPtr)}`)
          if (!vt.parent) { throw new Error(`fwd to sib from ${vt.name}, but no parent exists`) }
          let sib = vt.parent.children[PK.readArg(item.data, fwdPtr)]
          if (!sib) { throw new Error(`fwd to sib ${PK.readArg(item.data, fwdPtr)} from ${vt.name}, but none exists`) }
          vt = sib
          break;
        case PK.PARENT:
          LOGLOOP(`instruction is parent, ${PK.readArg(item.data, fwdPtr)}`)
          if (!vt.parent) { throw new Error(`fwd to parent from ${vt.name}, but no parent exists`) }
          vt = vt.parent
          break;
        case PK.CHILD:
          LOGLOOP(`instruction is child, ${PK.readArg(item.data, fwdPtr)}`)
          let child = vt.children[PK.readArg(item.data, fwdPtr)]
          if (!child) { throw new Error(`fwd to child ${PK.readArg(item.data, fwdPtr)} from ${vt.name}, none exists`) }
          vt = child
          break;
        // these are all cases where i.e. the vt itself will handle, or networking will happen, 
        case PK.PFWD:
        case PK.BFWD:
        case PK.BBRD:
        case PK.DEST:
        case PK.PINGREQ:
        case PK.PINGRES:
        case PK.SCOPEREQ:
        case PK.SCOPERES:
        case PK.LLESCAPE:
          LOGLOOP(`context exit at ${vt.name}, counts ${opCount} ops`)
          // this is the end stop, we should see if we can transport in, 
          if (vt.stackAvailableSpace(VT.STACK_DEST) >= 0) {
            LOGLOOP(`clear to shift in to ${vt.name} from ${item.vt.name}, shifting...`)
            // we shift ptrs up, 
            PK.walkPtr(item.data, ptr, item.vt, opCount)
            // and ingest it at the new place, clearing the source, 
            vt.handle(item.data, VT.STACK_DEST)
            item.handled()
          } else {
            LOGLOOP(`flow-controlled from ${vt.name} to ${item.vt.name}, awaiting...`)
            item.vt.requestLoopCycle()
          }
          // fwd-look is terminal here in all cases, 
          break fwdSweep;
        default:
          LOGLOOP(`internal transport failure, bad key ${item.data[fwdPtr]}`)
          item.handled()
          return
      } // end switch 
      fwdPtr += 2;
      opCount++;
    }
  } catch (err) {
    console.error(err)
    item.handled()
    return 
  }
}

export { osapLoop }