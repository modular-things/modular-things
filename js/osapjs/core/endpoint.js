/*
osap-endpoint.js

prototype software entry point / network endpoint for osap system

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS, VT, EP } from './ts.js'
import TIME from './time.js'
import PK from './packets.js'
import Vertex from './vertex.js'

let reverseRoute = (route) => {
  console.error(`badness, pls refactor for pk.writeReply`)
}

export default class Endpoint extends Vertex {
  constructor(parent, indice) {
    super(parent, indice)
  }

  /* to implement */
  // write this.onData(), returning promise when data is cleared out 
  // use this.transmit(bytes), 
  // use this.addRoute(route) to add routes 

  // endpoint addnl'y has outgoing routes, 
  routes = []
  type = VT.ENDPOINT
  name = "unnamed endpoint"

  // and has a local data cache 
  data = new Uint8Array(0)

  // has outgoing routes, 
  addRoute = function (route, mode = "acked") {
    // console.log(`adding route to ep ${this.indice}`, route)
    if (this.maxStackLength <= this.routes.length) {
      console.warn('increasing stack space to match count of routes')
      this.maxStackLength++
    }
    // endpoints store route objects that have a .mode setting,
    // ... 
    switch (mode) {
      case "ackless":
        route.mode = EP.ROUTEMODE_ACKLESS
        break;
      case "acked":
      default:
        route.mode = EP.ROUTEMODE_ACKED
        break;
    }
    this.routes.push(route)
  }

  // can upd8 how long it takes to to 
  timeoutLength = TIME.staleTimeout
  setTimeoutLength = (time) => {
    this.timeoutLength = time
  }

  // software data delivery, define per endpoint, 
  // onData handlers can return promises in order to enact flow control,
  onData = function (data) {
    return new Promise((resolve, reject) => {
      console.warn(`default endpoint onData at ${this.name}, dataLen is ${data.length}`)
      resolve()
    })
  }

  // local helper, wraps onData in always-promiseness,
  token = false
  onDataResolver = (data) => {
    try {
      let res = this.onData(data)
      if (res instanceof Promise) {   // return user promise, 
        return res
      } else {                        // invent & resolve promise, 
        return new Promise((resolve, reject) => {
          resolve()
        })
      }  
    } catch (err) {
      console.error(`error during onData call...`, err)
      return new Promise((resolve, reject) => {
        resolve()
      })
    }
  }

  // handles 'dest' keys at endpoints, 
  destHandler = function (item, ptr) {
    // item.data[ptr] == PK.PTR, item.data[ptr + 1] == PK.DEST 
    switch (item.data[ptr + 2]) {
      case EP.SS_ACKLESS:
        if (this.token) {
          // packet will wait for res, 
          return
        } else {
          this.token = true
          this.onDataResolver(new Uint8Array(item.data.subarray(ptr + 3))).then(() => {
            // resolution to the promise means data is OK, we accept 
            this.data = new Uint8Array(item.data.subarray(ptr + 3))
            this.token = false
          }).catch((err) => {
            // error / rejection means not our data, donot change internal, but clear for new 
            this.token = false
          })
          item.handled(); break;
        }
      case EP.SS_ACKED:
        if (this.token) {
          // packet will wait for res, 
          return
        } else {
          this.token = true
          this.onDataResolver(new Uint8Array(item.data.subarray(ptr + 4))).then(() => {
            this.data = new Uint8Array(item.data.subarray(ptr + 4))
            this.token = false
            // payload is just the dest key, ack key & id, id is at ptr + dest + key + id 
            let datagram = PK.writeReply(item.data, new Uint8Array([PK.DEST, EP.SS_ACK, item.data[ptr + 3]]))
            // we... should flowcontrol this, it's awkward, just send it, this is OK in JS 
            this.handle(datagram, VT.STACK_ORIGIN)
          }).catch((err) => {
            this.token = false
          })
          item.handled(); break;
        }
      case EP.SS_ACK:
        { // ack *to us* arriveth, check against awaiting transmits 
          let ackID = item.data[ptr + 3]
          for (let a = 0; a < this.acksAwaiting.length; a++) {
            if (this.acksAwaiting[a].id == ackID) {
              this.acksAwaiting.splice(a, 1)
            }
          }
          if (this.acksAwaiting.length == 0) {
            this.acksResolve()
          }
        }
        item.handled(); break;
      case EP.QUERY:
        {
          // new payload for reply, keys are dest, QUERY_RES, and ID from incoming, 
          let payload = new Uint8Array(3 + this.data.length)
          payload[0] = PK.DEST; payload[1] = EP.QUERY_RES; payload[2] = item.data[ptr + 3];
          // write-in data,
          payload.set(this.data, 3)
          // formulate packet, 
          let datagram = PK.writeReply(item.data, payload)
          this.handle(datagram, VT.STACK_ORIGIN)
        }
        item.handled(); break;
      case EP.ROUTE_QUERY_REQ:
        {
          // let's see about our route... it should be at 
          let rqid = item.data[ptr + 3]
          let indice = item.data[ptr + 4]
          // make payloads, 
          let payload = {}
          if (this.routes[indice]) {
            let route = this.routes[indice]
            // this is dest, reply key, id, mode, + 2 <ttl> + 2 <segsize> + route.length, 
            payload = new Uint8Array(4 + 4 + route.path.length)
            payload.set([PK.DEST, EP.ROUTE_QUERY_RES, rqid, route.mode], 0)
            let wptr = 4
            wptr += TS.write('uint16', route.ttl, payload, wptr)
            wptr += TS.write('uint16', route.segSize, payload, wptr)
            // write the actual path in... 
            payload.set(route.path, wptr)
          } else {
            // destination key, reply key, id to match, '0' to indicate no-route-here, 
            payload = new Uint8Array([PK.DEST, EP.ROUTE_QUERY_RES, rqid, 0])
          }
          // format reply, wipe & replace at dest stack,
          let datagram = PK.writeReply(item.data, payload)
          item.handled()
          this.handle(datagram, VT.STACK_DEST)
        }
        break;
      case EP.ROUTE_SET_REQ:
        {
          // uuuuh 
          let rqid = item.data[ptr + 3]
          // the new route would be: mode, ttl, segsize, path... as in the packet, 
          let route = {
            mode: item.data[ptr + 4],
            ttl: TS.read('uint16', item.data, ptr + 5),
            segSize: TS.read('uint16', item.data, ptr + 7),
            path: new Uint8Array(item.data.subarray(ptr + 9))
          }
          // add it... have infinite length in js, right? 
          this.addRoute(route)
          // and ack that, 1 is yes-it-worked, 0 is an error... more verbose later, maybe, haha 
          let datagram = PK.writeReply(item.data, [PK.DEST, EP.ROUTE_SET_RES, rqid, 1])
          item.handled()
          this.handle(datagram, VT.STACK_DEST)
        }
        break;
      case EP.ROUTE_RM_REQ:
        {
          // uuuuh 
          let rqid = item.data[ptr + 3]
          let indice = item.data[ptr + 4]
          // either/or, 
          let payload = new Uint8Array([PK.DEST, EP.ROUTE_RM_RES, rqid, 0])
          // now, if we can rm, do:
          if (this.routes[indice]) {
            this.routes.splice(indice, 1)
            payload[3] = 1
          }
          // wrip it & ship it, 
          let datagram = PK.writeReply(item.data, payload)
          item.handled()
          this.handle(datagram, VT.STACK_ORIGIN)
        }
        break;
      case EP.QUERY_RES:
        // query response, 
        console.error(`query response arrived at endpoint, should've gone to a query vt...`)
        item.handled()
        break;
      default:
        // not recognized: resolving here will cause pck to clear above 
        console.error(`nonrec endpoint key at ep ${this.indice}`)
        item.handled()
        break;
    }
  }

  runningAckID = 68
  acksAwaiting = []
  acksResolve = null

  // this could be smarter, since we already have this acksResolve() state 
  awaitAllAcks = (timeout = this.timeoutLength) => {
    return new Promise((resolve, reject) => {
      let startTime = TIME.getTimeStamp()
      let check = () => {
        if (this.acksAwaiting.length == 0) {
          resolve()
        } else if (TIME.getTimeStamp() - startTime > timeout) {
          reject(`awaitAllAcks timeout`)
        } else {
          setTimeout(check, 0)
        }
      }
      check()
    })
  }

  // transmit to all routes & await return before resolving, 
  write = async (data, mode = "ackless") => {
    try {
      // console.warn(`endpoint ${this.indice} writes ${mode}`)
      // it's the uint8-s only club again, 
      if (!(data instanceof Uint8Array)) throw new Error(`non-uint8_t write at endpoint, rejecting`);
      // otherwise keep that data, 
      this.data = data
      // now wait for clear space, we need as many slots open as we have routes to write to, 
      await this.awaitStackAvailableSpace(VT.STACK_ORIGIN, this.timeoutLength, this.routes.length)
      // now we can write our datagrams, yeah ?
      if (mode == "ackless") {
        for (let route of this.routes) {
          // this is data length + 1 (DEST) + 1 (EP_SSEG_ACKLESS)
          let payload = new Uint8Array(this.data.length + 2)
          payload[0] = PK.DEST
          payload[1] = EP.SS_ACKLESS
          payload.set(this.data, 2)
          // the whole gram, and uptake... 
          let datagram = PK.writeDatagram(route, payload)
          this.handle(datagram, VT.STACK_ORIGIN)
        } // that's it, ackless write is done, async will complete, 
      } else if (mode == "acked") {
        // wait to have zero previous acks awaiting... right ? 
        await this.awaitAllAcks()
        // now write 'em 
        for (let route of this.routes) {
          // data len + 1 (DEST) + 1 (EP_SSEG_ACKED) + 1 (ID)
          let payload = new Uint8Array(this.data.length + 3)
          payload[0] = PK.DEST
          payload[1] = EP.SS_ACKED
          let id = this.runningAckID
          this.runningAckID++; this.runningAckID = this.runningAckID & 0b11111111;
          payload[2] = id
          payload.set(this.data, 3)
          let datagram = PK.writeDatagram(route, payload)
          this.acksAwaiting.push({
            id: id,
          })
          this.handle(datagram, VT.STACK_ORIGIN)
        }
        // end conditions: we return a promise, rejecting on a timeout, resolving when all acks come back, 
        return new Promise((resolve, reject) => {
          let timeout = setTimeout(() => {
            reject(`write to ${this.name} times out w/ ${this.acksAwaiting.length} acks still awaiting`)
          }, this.timeoutLength)
          this.acksResolve = () => {
            clearTimeout(timeout)
            this.acksResolve = null
            resolve()
          }
          // erp, 
          if(this.routes.length == 0) resolve() 
        })
      } else {
        throw new Error(`endpoint ${this.name} written to w/ bad mode argument ${mode}, should be "acked" or "ackless"`)
      }
    } catch (err) {
      throw err
    }
  } // end write 

} // end endpoint 