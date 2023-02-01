/*
highLevel.js

osap high level prototypes / notions and configs 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import PK from './packets.js'
import TIME from './time.js'
import { VT, EP } from './ts.js'

export default function HighLevel(osap) {
  // ------------------------------------------------------ KeepAlive Codes 
  let runKA = async (vvt, freshness) => {
    try {
      // random stutter to avoid single-step overcrowding in large systems 
      // console.warn(`setting up keepAlive for ${vvt.name} at ${freshness}ms interval`)
      await TIME.delay(Math.random() * freshness)
      let lastErrorCount = 0
      let lastDebugCount = 0
      // looping KA 
      let first = false
      while (true) {
        let stat = await osap.mvc.getContextDebug(vvt.route)
        if (first) {
          lastErrorCount = stat.errorCount
          lastDebugCount = stat.debugCount
          first = false
        } else {
          if (stat.errorCount > lastErrorCount) {
            lastErrorCount = stat.errorCount
            stat = await osap.mvc.getContextDebug(vvt.route, "error")
            console.error(`ERR from ${vvt.name}: ${stat.msg}`)
          }
          if (stat.debugCount > lastDebugCount) {
            lastDebugCount = stat.debugCount
            stat = await osap.mvc.getContextDebug(vvt.route, "debug")
            console.warn(`LOG from ${vvt.name}: ${stat.msg}`)
          }
        }
        await TIME.delay(freshness)
      }
    } catch (err) {
      console.error(`KA: keepAlive on ${vvt.name} ends w/ failure:`, err)
    }
  }

  // ... 
  this.addToKeepAlive = async (name, freshness = 1000) => {
    try {
      // find it, start it... 
      let list = await osap.nr.findMultiple(name)
      if (list.length == 0) throw new Error(`can't find any instances of '${name}' in this graph...`)
      console.log(`KA: adding ${list.length}x '${name}' to the keepAlive loop`)
      for (let vvt of list) {
        runKA(vvt, freshness)
      }
    } catch (err) {
      throw err
    }
  }

  // ------------------------------------------------------ Bus Broadcast Routes 
  this.buildBroadcastRoute = async (transmitterName, targetNames, recipientName, log = false, graph) => {
    if (!Array.isArray(targetNames)) throw new Error(`BBR: needs a list of target names, not singletons`)
    try {
      // ---------------------------------------- 1. get a local image of the graph, also configured routes 
      if(!graph) graph = await osap.nr.sweep()
      if (log) console.log(`BBR: got a graph image...`)
      await osap.mvc.fillRouteData(graph)
      if (log) console.log(`BBR: reclaimed route data for the graph...`)
      // ---------------------------------------- 1: get vvts for the transmitter, and each recipient... 
      let transmitter = await osap.nr.find(transmitterName, graph)
      if (log) console.log(`BBR: found 1x transmitter endpoint '${transmitter.name}', now collecting recipients...`)
      let potentials = await osap.nr.findMultiple(recipientName, graph)
      // we only want those recipients that are within our named firmware, so 
      let recipients = []
      for (let rx of potentials) {
        for (let name of targetNames) {
          if (rx.parent.name == name) {
            recipients.push({ endpoint: rx })
            break
          }
        }
      }
      // we probably want one endpoint per target-device supplied, so 
      if(recipients.length > targetNames.length) throw new Error(`BBR: likely that we missed an endpoint...`)
      if (log) console.log(`BBR: found ${recipients.length}x recipient endpoints '${recipientName}'`)
      // ---------------------------------------- 2: poke around amongst each recipient to find bus drops, 
      recipientLoop: for (let rx of recipients) {
        for (let sib of rx.endpoint.parent.children) {
          if (sib.type == VT.VBUS) {
            rx.vbus = sib
            continue recipientLoop;
          }
        }
      }
      // we now have a list of recipients: [{endpoint: <>, vbus: <>}]
      // ---------------------------------------- 3: for each pair, find channels that already work, and first-free channel
      for (let rx of recipients) {
        // find first-free 
        for (let ch in rx.vbus.broadcasts) {
          if (rx.vbus.broadcasts[ch] == undefined) {
            rx.firstFree = ch
            break
          }
        }
        // find existing, 
        rx.existingChannel = null
        for (let ch in rx.vbus.broadcasts) {
          let channel = rx.vbus.broadcasts[ch]
          if (channel != undefined) {
            let walk = osap.nr.routeWalk(channel, rx.vbus)
            if (walk.state == 'incomplete') throw new Error(`previously config'd bus channel looks broken?`)
            if (walk.path[walk.path.length - 1] == rx.endpoint) {
              if (log) console.log(`BBR: found an existing drop-route on ch ${ch}`)
              rx.existingChannel = ch
              break;
            }
          }
        }
      }
      // console.log(`recipients`, recipients)
      // ---------------------------------------- 4: if all recipients are on the same existing channel, that's us, 
      let existingChannel = recipients[0].existingChannel
      if (existingChannel) {
        for (let rx of recipients) {
          if (rx.existingChannel == existingChannel) {
            // great, carry on... 
          } else {
            throw new Error(`BBR: looks like *some* drops have an existing ch, not all, awkward diff...`)
          }
        }
      }
      // ---------------------------------------- 5: pick a channel to build, and build drop-side, 
      let channelSelect = 0
      if (!existingChannel) {
        // select the first available, 
        for (let rx of recipients) {
          if (parseInt(rx.firstFree) > channelSelect) channelSelect = parseInt(rx.firstFree)
        }
        // build drop-routes... 
        for (let rx of recipients) {
          let routeFromVBus = osap.nr.findRoute(rx.vbus, rx.endpoint)
          if (!routeFromVBus) throw new Error(`failed to find vbus-to-endpoint route...`)
          await osap.mvc.setVBusBroadcastChannel(rx.vbus.route, channelSelect, routeFromVBus)
          if (log) console.log(`BBR: just built one new drop-route on ch ${channelSelect} at ${rx.endpoint.parent.name}`)
          if (log) PK.logRoute(routeFromVBus, false)
        }
      } else {
        channelSelect = existingChannel
        if (log) console.log(`BBR: will use existing drop-routes on ch ${channelSelect}`)
      }
      // ---------------------------------------- 6: build an outgoing route to that channel... 
      // the target is going to be...
      let headVBus = recipients[0].vbus.reciprocals[0]
      if (!headVBus) throw new Error(`BBR can't find the head of this vbus... ??`)
      if (log) console.log(`BBR: found the broadcasting head within ${headVBus.parent.name}`)
      // we want a route to this object, 
      let routeFromTransmitter = osap.nr.findRoute(transmitter, headVBus)
      if (!routeFromTransmitter) throw new Error(`BBR failed to walk a route from bus-broadcast transmitter to bus head`)
      // to broadcast at the end of this, we append the broadcast instruction... 
      routeFromTransmitter = PK.route(routeFromTransmitter).bbrd(channelSelect).end()
      // PK.logRoute(routeFromTransmitter)
      // let's check that the transmitter doesn't already have this route attached?
      let prevTxRoute = false
      for (let rt of transmitter.routes) {
        if (PK.routeMatch(rt, routeFromTransmitter)) {
          if (log) console.log(`BBR: a route from the transmitter to the head-vbus already exists`)
          if (log) PK.logRoute(routeFromTransmitter, false)
          prevTxRoute = true
          break
        }
      }
      // can set that up as well...
      if (!prevTxRoute) {
        // no acks on broadcasts, 
        routeFromTransmitter.mode = EP.ROUTEMODE_ACKLESS 
        await osap.mvc.setEndpointRoute(transmitter.route, routeFromTransmitter)
        if (log) console.log(`BBR: we've just built a new route from the transmitter to the bus head`)
        if (log) PK.logRoute(routeFromTransmitter, false)
      }
      // now return something that we could use later to delete 'em with?
      // or just go back to stateless / name-finding... 
      return channelSelect
    } catch (err) {
      console.error(`failed to build broadcast route from ${transmitterName} to '${recipientName}'s`)
      throw err
    }
  } // end buildBroadcastRoute 

  this.removeBroadcastRoute = async (channel, log = false) => {
    channel = parseInt(channel)
    try {
      // ---------------------------------------- 1. get a local image of the graph, also configured routes 
      let graph = await osap.nr.sweep()
      if (log) console.log(`BBRemove: got a graph image...`)
      await osap.mvc.fillRouteData(graph)
      if (log) console.log(`BBRemove: reclaimed route data for the graph...`)
      // ---------------------------------------- 2. flatten everything: we're assuming there's one (1) bus, anything on this ch is ripe for rm 
      let list = osap.nr.flatten(graph) 
      // ---------------------------------------- 3. look around for vbusses, check this ch, delete, 
      for(let vvt of list){
        if(vvt.type == VT.VBUS){
          if(vvt.broadcasts[channel]){
            if(log) console.log(`BBRemove: rming channel from ${vvt.parent.name}'s ${vvt.name}`)
            await osap.mvc.removeVBusBroadcastChannel(vvt.route, channel)
          }
        }
      }
      // ---------------------------------------- 4. rm anything transmitting on this channel... 
      for(let vvt of list){
        if(vvt.type == VT.ENDPOINT){
          for(let rt in vvt.routes){
            rt = parseInt(rt)
            let route = vvt.routes[rt]
            if(route.path[route.path.length - 2] == PK.BBRD){
              if(route.path[route.path.length - 1] == channel){
                if(log) console.log(`BBRemove: rming broadcast route from ${vvt.parent.name}'s ${vvt.name}`)
                await osap.mvc.removeEndpointRoute(vvt.route, rt)
                return 
              }
            }
          }
        }
      }
    } catch (err) {
      throw err
    }
  }
}