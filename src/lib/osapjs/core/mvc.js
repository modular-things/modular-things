/*
mvc.js

getters and setters, etc, for remote elements 

so far, almost entirely to-do with route config,
in the future, will be used more broadly: we probably want a stronger underlying type system 
and gettings / setters that generalize on those... i.e. structs : remote structs etc, 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS, VT, EP, VBUS, RT, RPC } from './ts.js'
import TIME from './time.js'
import PK from './packets.js'

let ROUTEREQ_MAX_TIME = 2000 // ms 

export default function OMVC(osap) {
  // ------------------------------------------------------ Query IDs
  // msgs all have an ID... 
  // we just use one string of 'em, then can easily dispatch callbacks, 
  let runningQueryID = 112
  let getNewQueryID = () => {
    runningQueryID++
    runningQueryID = runningQueryID & 0b11111111
    return runningQueryID
  }
  let queriesAwaiting = []

  // ------------------------------------------------------ RPC Info Collect
  // uses existing virtual vertex, froma .sweep(), 
  this.getRPCInfo = async (vvt) => {
    try {
      let route = vvt.route
      if (vvt.type != VT.RPC) throw new Error(`attempt to do RPC.getInfo() on a non-rpc endpoint`)
      await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
      let id = getNewQueryID()
      let payload = new Uint8Array([PK.DEST, RPC.INFO_REQ, id])
      let datagram = PK.writeDatagram(route, payload)
      osap.handle(datagram, VT.STACK_ORIGIN)
      return new Promise((resolve, reject) => {
        let timeoutFn = () => {
          reject(`timed out`)
        }
        let timeout = setTimeout(timeoutFn, 1000)
        queriesAwaiting.push({
          id: id,
          onResponse: function (data) {
            clearTimeout(timeout)
            // build reply & issue it, 
            let res = {
              name: vvt.name.slice(4),
              route: route,
              argKey: data[0],
              argLen: TS.read("uint16", data, 1),   // # in array 
              argSize: TS.read("uint16", data, 3),   // total bytes 
              retKey: data[5],
              retLen: TS.read("uint16", data, 6),
              retSize: TS.read("uint16", data, 8),
            }
            resolve(res)
          }
        })
      })
    } catch (err) {
      throw err
    }
  }

  // ------------------------------------------------------ Context Debuggen 
  this.getContextDebug = async (route, stream = "none", maxRetries = 3) => {
    try {
      await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
      let id = getNewQueryID()
      // these are all going to get more or less the same response, 
      let payload = new Uint8Array([PK.DEST, 0, id])
      switch (stream) {
        case "none":
          payload[1] = RT.DBG_STAT
          break;
        case "error":
          payload[1] = RT.DBG_ERRMSG
          break;
        case "debug":
          payload[1] = RT.DBG_DBGMSG
          break;
        default:
          throw new Error("odd stream spec'd for getContextDebug, should be 'error' or 'debug'")
      } // end switch 
      let datagram = PK.writeDatagram(route, payload)
      osap.handle(datagram, VT.STACK_ORIGIN)
      // handler
      return new Promise((resolve, reject) => {
        let retries = 0
        let timeoutFn = () => {
          if (retries > maxRetries) {
            reject(`debug collect timeout to ${route.path}`)
          } else {
            retries++
            console.warn(`CONTEXT DEBUG RETRYING... count ${retries}`)
            osap.handle(datagram, VT.STACK_ORIGIN)
            timeout = setTimeout(timeoutFn, 1000)
          }
        }
        let timeout = null
        queriesAwaiting.push({
          id: id,
          onResponse: function (data) {
            clearTimeout(timeout)
            let res = {
              loopHighWaterMark: TS.read("uint32", data, 0),
              errorCount: TS.read("uint32", data, 4),
              debugCount: TS.read("uint32", data, 8),
              version: TS.read("uint32", data, 12)
            }
            if (stream != "none") {
              res.msg = TS.read("string", data, 16).value
            }
            resolve(res)
          }
        })
        timeout = setTimeout(timeoutFn, 1000)
      })
    } catch (err) {
      throw err
    }
  }

  // ------------------------------------------------------ Batch Route Infill 

  this.fillRouteData = async (graph) => {
    try {
      // we'll make lists of endpoints & vbussess, 
      let endpoints = []
      let busses = []
      let vertices = osap.nr.flatten(graph)
      for (let vt of vertices) {
        if (vt.type == VT.ENDPOINT) endpoints.push(vt)
        if (vt.type == VT.VBUS) busses.push(vt)
      }
      // then just get through 'em and collect routes 
      for (let ep of endpoints) {
        let routes = await this.fillEndpointRoutes(ep.route)
        ep.routes = routes
      }
      for (let vbus of busses) {
        let broadcasts = await this.fillVBusBroadcastChannels(vbus.route)
        // append broadcasts to vbus...
        vbus.broadcasts = broadcasts
      }
      // we've been editing by reference, so the graph is now 'full' 
      return graph
    } catch (err) {
      throw err
    }
  }

  // ------------------------------------------------------ Per-Endpoint Route List Collection 
  this.fillEndpointRoutes = async (route) => {
    // alright, do it in a loop until they return an empty array, 
    // also... endpoint route objects, should *not* return the trailing three digits (?) 
    // or should ? the vvt .route object doesn't, 
    try {
      let indice = 0, routes = []
      while (true) {
        let epRoute = await this.getEndpointRoute(route, indice)
        if (epRoute != undefined) {
          routes[indice] = epRoute
          indice++
        } else {
          break
        }
      } // end while 
      return routes
    } catch (err) {
      // pass it up... 
      console.error(err)
      throw (err)
    }
  }

  // ------------------------------------------------------ Per-VBus Broadcast Collection 
  this.fillVBusBroadcastChannels = async (route) => {
    // bus channels are not necessarily stacked up (0-n) like broadcast channels are, 
    // i.e they might be sparse: we can't just ask for "how many" and then query 0-n,
    // since i.e. some previosly-configured broadcast is useful on new bus drops ...
    // but we query 0-n, get channels at each indice, throw indice away, taking for granted
    // that while we're querying, no one else is adding / rm'ing channel configs... 
    // route is a route *to* the vbus, so we are making vbus mvc requests... 
    try {
      // this collects that map, should be an array of some fixed length, w/ 'undefined' in 
      // empty slots, and the string literal 'exists' in channels where routes exist... 
      // then we go through per channel and query... 
      let map = await this.getVBusBroadcastMap(route)
      for (let ch = 0; ch < map.length; ch++) {
        if (map[ch] == 'exists') {
          let channelRoute = await this.getVBusBroadcastChannel(route, ch)
          map[ch] = channelRoute
        }
      }
      return map
    } catch (err) {
      throw err
    }
  }

  // ------------------------------------------------------ Per-VBus Broadcast Map 
  this.getVBusBroadcastMap = async (route) => {
    // wait for clear space, 
    try {
      await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
    } catch (err) {
      throw err
    }
    // payload... 
    let id = getNewQueryID()
    let payload = new Uint8Array([PK.DEST, VBUS.BROADCAST_MAP_REQ, id])
    let datagram = PK.writeDatagram(route, payload)
    osap.handle(datagram, VT.STACK_ORIGIN)
    // handler, 
    return new Promise((resolve, reject) => {
      queriesAwaiting.push({
        id: id,
        timeout: setTimeout(() => {
          reject(`vbus broadcast map req timeout to ${route.path}`)
        }, 1000),
        onResponse: function (data) {
          // clear timer, 
          clearTimeout(this.timeout)
          // bytes 0, 1 are length 
          let rptr = 0
          let map = new Array(data[rptr++])
          let bitByteModulo = 0
          for (let ch = 0; ch < map.length; ch++) {
            map[ch] = (data[rptr] & (1 << bitByteModulo) ? 'exists' : undefined) // lol, 
            bitByteModulo++
            if (bitByteModulo >= 8) {
              bitByteModulo = 0
              rptr++
            }
          }
          resolve(map)
        }
      })
    })
  }

  // ------------------------------------------------------ VBus Broadcast Channel Collect
  this.getVBusBroadcastChannel = async (route, channel) => {
    // wait for clear space, 
    try {
      await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
    } catch (err) {
      throw err
    }
    // payload is pretty simple, 
    let id = getNewQueryID()
    let payload = new Uint8Array([PK.DEST, VBUS.BROADCAST_QUERY_REQ, id, channel])
    let datagram = PK.writeDatagram(route, payload)
    // ship it from the root vertex, 
    osap.handle(datagram, VT.STACK_ORIGIN)
    // setup handler, 
    return new Promise((resolve, reject) => {
      queriesAwaiting.push({
        id: id,
        timeout: setTimeout(() => {
          reject(`vbus broadcast ch req timeout to ${route.path}`)
        }, 1000),
        onResponse: function (data) {
          // clear timer, 
          clearTimeout(this.timeout)
          // make a new route object for our caller, 
          if (data[0] == 0) {
            // [0] here means emptiness 
            resolve()
          } else {
            resolve({
              ttl: TS.read('uint16', data, 1),
              segSize: TS.read('uint16', data, 3),
              path: new Uint8Array(data.subarray(5))
            })
          }
        }
      })
    })
  }

  // ------------------------------------------------------ VBus Broadcast Channel Set 
  this.setVBusBroadcastChannel = async (routeToVBus, channel, routeFromChannel) => {
    channel = parseInt(channel)
    try {
      await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
    } catch (err) {
      throw err
    }
    let id = getNewQueryID()
    // + DEST, + ROUTE_SET, + ID, + CH + Route (route.length + ttl + segsize)
    let payload = new Uint8Array(4 + routeFromChannel.path.length + 4)
    payload.set([PK.DEST, VBUS.BROADCAST_SET_REQ, id, channel])
    let wptr = 4
    // though broadcast channels don't use 'em yet, we just serialize as a 'route' type... 
    wptr += TS.write('uint16', routeFromChannel.ttl, payload, wptr)
    wptr += TS.write('uint16', routeFromChannel.segSize, payload, wptr)
    payload.set(routeFromChannel.path, wptr)
    // grams grams grams 
    let datagram = PK.writeDatagram(routeToVBus, payload)
    osap.handle(datagram, VT.STACK_ORIGIN)
    // handler... 
    return new Promise((resolve, reject) => {
      queriesAwaiting.push({
        id: id,
        timeout: setTimeout(() => {
          reject(`broadcast channel set req timeout`)
        }, 1000),
        onResponse: function (data) {
          //console.warn(`ROUTE SET REPLY`)
          if (data[0]) {
            resolve()
          } else {
            reject(`badness error code ${data} from vbus, on try-to-set-new-broadcast`)
          }
        }
      })
    })
  }

  // ------------------------------------------------------ VBus Broadcast Channel Remove 
  this.removeVBusBroadcastChannel = async (routeToVBus, channel) => {
    try {
      await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
    } catch (err) {
      throw err
    }
    let id = getNewQueryID()
    let payload = new Uint8Array([PK.DEST, VBUS.BROADCAST_RM_REQ, id, channel])
    let datagram = PK.writeDatagram(routeToVBus, payload)
    osap.handle(datagram, VT.STACK_ORIGIN)
    // setup handler, 
    return new Promise((resolve, reject) => {
      queriesAwaiting.push({
        id: id,
        timeout: setTimeout(() => {
          reject('broadcast ch rm req timeout')
        }, 1000),
        onResponse: function (data) {
          if (data[0]) {
            resolve()
          } else {
            reject(`badness error code ${data[ptr + 1]} from endpoint, on try-to-delete-broadcast-channel`)
          }
        }
      })
    })
  }

  // ------------------------------------------------------ Per-Indice Route Collection 
  this.getEndpointRoute = async (route, indice) => {
    // wait for clear space, 
    try {
      await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
    } catch (err) {
      throw err
    }
    try {
      // payload is pretty simple, 
      let id = getNewQueryID()
      let payload = new Uint8Array([PK.DEST, EP.ROUTE_QUERY_REQ, id, indice])
      let datagram = PK.writeDatagram(route, payload)
      // ship it from the root vertex, 
      osap.handle(datagram, VT.STACK_ORIGIN)
      return new Promise((resolve, reject) => {
        queriesAwaiting.push({
          id: id,
          timeout: setTimeout(() => {
            reject(`route req ${id} timeout to ${route.path}`)
          }, ROUTEREQ_MAX_TIME),
          onResponse: function (data) {
            // make a new route object for our caller, 
            let routeMode = data[0]
            // if mode == 0, no route exists at this indice, resolve undefined 
            // otherwise... resolve the route... 
            if (routeMode == 0) {
              resolve()
            } else {
              resolve({
                mode: routeMode,
                ttl: TS.read('uint16', data, 1),
                segSize: TS.read('uint16', data, 3),
                path: new Uint8Array(data.subarray(5))
              })
            }
          }
        }) // end push 
      }) // end promise-return, 
    } catch (err) {
      console.error(err)
    }
  }

  // ------------------------------------------------------ Endpoint Route-Addition Request 
  this.setEndpointRoute = async (routeToEndpoint, routeFromEndpoint) => {
    // not all routes have modes, set a default, 
    if (!routeFromEndpoint.mode) { routeFromEndpoint.mode = EP.ROUTEMODE_ACKED }
    // ok we dooooo
    await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
    // similar...
    let id = getNewQueryID()
    // + DEST, + ROUTE_SET, + ID, + Route (route.length + mode + ttl + segsize)
    let payload = new Uint8Array(3 + routeFromEndpoint.path.length + 5)
    payload.set([PK.DEST, EP.ROUTE_SET_REQ, id, routeFromEndpoint.mode])
    let wptr = 4
    wptr += TS.write('uint16', routeFromEndpoint.ttl, payload, wptr)
    wptr += TS.write('uint16', routeFromEndpoint.segSize, payload, wptr)
    payload.set(routeFromEndpoint.path, wptr)
    // gram it up, 
    let datagram = PK.writeDatagram(routeToEndpoint, payload)
    // ship it 
    osap.handle(datagram, VT.STACK_ORIGIN)
    // setup handler 
    return new Promise((resolve, reject) => {
      queriesAwaiting.push({
        id: id,
        timeout: setTimeout(() => {
          reject(`route set req timeout`)
        }, ROUTEREQ_MAX_TIME),
        onResponse: function (data) {
          //console.warn(`ROUTE SET REPLY`)
          if (data[0]) {
            // ep's reply with the indice where they stuffed the route... 
            resolve(data[1])
          } else {
            reject(`badness error code ${data} from endpoint, on try-to-set-new-route`)
          }
        }
      })
    })
  }

  // ------------------------------------------------------ Endpoint Route-Delete Request 
  this.removeEndpointRoute = async (routeToEndpoint, indice) => {
    await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
    // same energy
    let id = getNewQueryID()
    // + DEST, + ROUTE_RM, + ID, + Indice 
    let payload = new Uint8Array([PK.DEST, EP.ROUTE_RM_REQ, id, indice])
    let datagram = PK.writeDatagram(routeToEndpoint, payload)
    osap.handle(datagram, VT.STACK_ORIGIN)
    // setup handler, 
    return new Promise((resolve, reject) => {
      queriesAwaiting.push({
        id: id,
        timeout: setTimeout(() => {
          reject('route rm req timeout')
        }, ROUTEREQ_MAX_TIME),
        onResponse: function (data) {
          if (data[0]) {
            resolve()
          } else {
            reject(`badness error code ${data[0]} from endpoint, on try-to-delete-route`)
          }
        }
      })
    })
  }

  // ------------------------------------------------------ Rename Vertex Request 
  this.renameVertex = async (routeToVertex, name) => {
    await osap.awaitStackAvailableSpace(VT.STACK_ORIGIN)
    // likewise 
    let id = getNewQueryID()
    // + DEST + RENAME_REQ, + ID, + str 
    let payload = new Uint8Array(3 + name.length + 4)
    payload[0] = PK.DEST
    payload[1] = RT.RENAME_REQ
    payload[2] = id
    TS.write("string", name, payload, 3)
    console.log('rename packet like', payload)
    let datagram = PK.writeDatagram(routeToVertex, payload)
    osap.handle(datagram)
    return new Promise((resolve, reject) => {
      queriesAwaiting.push({
        id: id,
        timeout: setTimeout(() => {
          reject('rename request timed out')
        }, 2500),
        onResponse: function (data) {
          if (data[0]) {
            resolve()
          } else {
            reject(`badness error code ${data[0]} from vertex on rename-request, maybe no-flash-mem in this micro`)
          }
        }
      })
    })
  }

  // ------------------------------------------------------ Destination Handler: Dispatching Replies 
  this.destHandler = (item, ptr) => {
    // here data[ptr] == PK.PTR, then ptr + 1 is PK.DEST, ptr + 2 is key for us, 
    // ... we could do: 
    // mvc things w/ one attach-and-release reponse handlers and root-unique request IDs, non?
    keySwitch: switch (item.data[ptr + 2]) {
      case EP.ROUTE_QUERY_RES:
      case EP.ROUTE_SET_RES:
      case EP.ROUTE_RM_RES:
      case VBUS.BROADCAST_MAP_RES:
      case VBUS.BROADCAST_QUERY_RES:
      case VBUS.BROADCAST_SET_RES:
      case VBUS.BROADCAST_RM_RES:
      case RT.ERR_RES:
      case RT.DBG_RES:
      case RT.RENAME_RES:
      case RPC.INFO_RES:
        {
          // match to id, send to handler, carry on... 
          let rqid = item.data[ptr + 3]
          for (let rq in queriesAwaiting) {
            if (queriesAwaiting[rq].id == rqid) {
              // do onResponse w/ reply-specific payload... 
              queriesAwaiting[rq].onResponse(new Uint8Array(item.data.subarray(ptr + 4)))
              queriesAwaiting.splice(rq, 1)
              break keySwitch;
            }
          }
          // some network retries etc can result in double replies... this is OK, happens... 
          console.warn(`recvd mvc response ${rqid}, but no matching req awaiting... of ${queriesAwaiting.length}`)
          break;
        }
        break;
      case RPC.CALL_RES:
        osap.rpc.destHandler(item, ptr)
        break;
      default:
        console.error(`unrecognized key in osap root / mvc dest handler, ${item.data[ptr]}`)
        PK.logPacket(item.data)
    } // end switch, 
    // all mvc replies get *handled* 
    item.handled()
  }
}