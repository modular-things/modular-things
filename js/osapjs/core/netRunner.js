/*
netRunner.js

graph search routines, in JS, for OSAP systems 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2021

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS, VT } from './ts.js'
import TIME from './time.js'
import PK from './packets.js'

export default function NetRunner(osap) {

  let scanStartTime = 0
  let allNetworkVertices = []
  let latestSweep = {
    runTime: 0,
    graph: null
  }

  // runs a sweep, starting at the osap root vertex 
  this.sweep = async () => {
    scanStartTime = TIME.getTimeStamp()
    // to find loops, we keep a list of all of the network-capable vertices (vports and vbusses) that we find,
    allNetworkVertices = []
    return new Promise(async (resolve, reject) => {
      try {
        // make root from our own root note... 
        let root = await osap.scope(PK.route().end(250, 128), scanStartTime)
        // try a recursor based on root objects, using also our entry point, 
        await this.searchContext(root, null)
        console.warn(`SWEEP done in ${TIME.getTimeStamp() - scanStartTime}ms`)
        latestSweep = {
          runTime: TIME.getTimeStamp(),
          graph: root
        }
        resolve(root)
      } catch (err) {
        console.error(err)
        reject('sweep fails')
      }
    })
  }

  this.getLatestSweep = async (freshness = 750) => {
    try {
      if (TIME.getTimeStamp() - latestSweep.runTime > freshness) {
        console.warn(`Refreshing sweep...`)
        let graph = await this.sweep()
        latestSweep = {
          runTime: TIME.getTimeStamp(),
          graph: graph
        }
      }
      return latestSweep.graph
    } catch (err) {
      throw err
    }
  }

  this.forceSweepUpdate = async () => {
    try {
      let graph = await this.sweep()
      latestSweep = {
        runTime: TIME.getTimeStamp(),
        graph: graph
      }
    } catch (err) {
      throw err
    }
  }

  this.searchContext = async (root, entrance) => {
    try {
      let contextScanTime = TIME.getTimeStamp()
      // get data for new children... i.e. the entrance should already be all hooked up, 
      for (let c = 0; c < root.children.length; c++) {
        if (root.children[c] == undefined) {
          root.children[c] = await osap.scope(PK.route(root.route).child(c).end(), contextScanTime)
          root.children[c].parent = root
        }
      }
      // stash flat-list of all network-capable vertices, for loop detection 
      for (let c = 0; c < root.children.length; c++) {
        allNetworkVertices.push(root.children[c])
      }
      // now poke through, check on network hops, 
      for (let c = 0; c < root.children.length; c++) {
        let vt = root.children[c]
        // don't traverse back from whence we came, 
        if (vt == entrance) continue
        if (vt.type == VT.VPORT) { //---------------------------------- if vport, find vport partner, 
          if (vt.linkState) {
            // we try to catch the reciprocal, or we time out... 
            let reciprocal = {}
            try {
              // get reciprocal port & reverse-plumb, 
              reciprocal = await osap.scope(PK.route(root.route).child(c).pfwd().end(), contextScanTime)
              reciprocal.reciprocal = vt
              // loop detect... just fail, we did handle these before, 
              if (loopDetect(reciprocal)) continue;
              // and that things' parent, 
              reciprocal.parent = await osap.scope(PK.route(reciprocal.route).parent().end(), contextScanTime)
              // if that works, we do a little plumbing:
              reciprocal.parent.children[reciprocal.indice] = reciprocal
              // then we can carry on to the next, 
              await this.searchContext(reciprocal.parent, reciprocal)
            } catch (err) {
              console.warn(`${vt.name} at ${root.name}'s reciprocal traverse error, reason:`, err)
              reciprocal = { type: "unreachable" }
            }
            // plumb it & reverse it, 
            vt.reciprocal = reciprocal
          } else {
            vt.reciprocal = { type: "unreachable" }
          }
        } else if (vt.type == VT.VBUS) { //--------------------------- if vbus, find bus partner for each... 
          allNetworkVertices.push(vt)
          for (let d = 0; d < vt.linkState.length; d++) {
            let reciprocal = {}
            if (vt.linkState[d]) {
              try {
                reciprocal = await osap.scope(PK.route(root.route).child(c).bfwd(d).end(), contextScanTime)
                reciprocal.reciprocals[vt.ownRxAddr] = vt
                if (loopDetect(reciprocal)) continue;
                reciprocal.parent = await osap.scope(PK.route(reciprocal.route).parent().end(), contextScanTime)
                reciprocal.parent.children[reciprocal.indice] = reciprocal
                await this.searchContext(reciprocal.parent, reciprocal)
              } catch (err) {
                console.warn(`${vt.name}'s reciprocal traverse error, reason:`, err)
                reciprocal = { type: "unreachable" }
              }
            } else {
              reciprocal = { type: "unreachable" }
            }
            // plumb it, & the reverse... 
            vt.reciprocals[d] = reciprocal
          }
        }
      }
    } catch (err) {
      console.warn(`Search at ${root.name} fails`)
      console.error(err)
    }
  }

  let loopDetect = (nv) => {
    return false
    // if this has been tagged previously at some time *since* we started the most recent scan, 
    if (nv.previousTimeTag > scanStartTime) {
      // it's likely a duplicate / loop of something we've already scanned, so go looking:
      for (let v of allNetworkVertices) {
        if (v.type == "unreachable") continue;
        if (v.name == nv.name) {
          throw new Error('this is a candidate, but this fn is unfinished: need time info to pick uniqueness')
        }
      }
      throw new Error('loop detecting fn is unfinished: plan was to detect & plumb loops here, returning true')
    } else {
      return false
    }
  }

  this.flatten = (graph) => {
    let list = []
    let recursor = (root, entrance) => {
      //console.log(`recursing ${root.name}`)
      list.push(root)
      for (let child of root.children) {
        list.push(child)
        if (child == entrance) continue
        if (child.type == VT.VPORT) {
          if (child.reciprocal.type != "unreachable") {
            recursor(child.reciprocal.parent, child.reciprocal)
          }
        } else if (child.type == VT.VBUS) {
          for (let recip of child.reciprocals) {
            if (recip.type != "unreachable") {
              recursor(recip.parent, recip)
            }
          }
        }
      } // end for-child-of-root,
    } // end recursor
    recursor(graph)
    return list
  }

  // also not loop-safe atm, 
  this.find = async (vtName, start) => {
    try {
      let list = await this.findMultiple(vtName, start)
      if (list.length > 1) throw new Error(`found *multiple* instances of '${vtName}' !`)
      if (list.length == 0) throw new Error(`can't find any vertex w/ the name '${vtName}' in this graph`)
      return list[0]
    } catch (err) {
      throw err
    }
  }

  this.findMultiple = async (vtName, start) => {
    try {
      let list = []
      if (!start) start = await this.getLatestSweep()
      let candidates = this.flatten(start)
      for (let vvt of candidates) {
        // if(vvt.name.includes("rt_")) console.log(vvt.name)
        if (vvt.name == vtName) list.push(vvt)
      }
      return list
    } catch (err) {
      throw err
    }
  }

  this.findWithin = async (vtName, parentName, start) => {
    try {
      let list = []
      if (!start) start = await this.getLatestSweep()
      let candidates = this.flatten(start)
      for (let vvt of candidates) {
        if (vvt.name == parentName) {
          for (let child of vvt.children) {
            if (child.name == vtName) return child
          }
        }
      }
      throw new Error(`no vertex ${vtName} found within any ${parentName}`)
    } catch (err) {
      throw err
    }
  }

  // mmmm, this would be in "highLevel" and could include options to find-within for each... 
  this.connect = async (headName, tailName) => {
    try {
      let graph = await this.sweep()
      console.warn(graph)
      let head = await this.find(headName, graph)
      let tail = await this.find(tailName, graph)
      //console.warn(`found the head, the tail...`, head, tail)
      let route = this.findRoute(head, tail)
      //console.warn(`the route betwixt...`, route)
      //PK.logRoute(route)
      // then we could do this to add the route / make the connection: 
      await osap.mvc.setEndpointRoute(head.route, route)
      return route
    } catch (err) {
      throw err
    }
  }

  // walks routes along a virtual graph, returning a list of stops, 
  this.routeWalk = (route, source) => {
    //console.log('walking', route, 'from', source)
    if (!(route.path instanceof Uint8Array)) { throw new Error(`strange route structure in the routeWalk fn, netRunner`) }
    // we'll make a list... of vvts, which are on this path, 
    // walking along the route... 
    let ptr = 1, indice = 0, vvt = source, list = []
    // append vvt to head of list, or no? yah, should do 
    list.push(vvt)
    for (let s = 0; s < 16; s++) {
      if (ptr >= route.path.length) {
        return { path: list, state: 'complete' }
      }
      switch (route.path[ptr]) {
        case PK.SIB:
          indice = PK.readArg(route.path, ptr)
          // do we have it ? 
          if (vvt.parent && vvt.parent.children[indice]) {
            vvt = vvt.parent.children[indice]
            list.push(vvt)
            break;
          } else {
            return { path: list, state: 'incomplete', reason: 'missing sib' }
          }
        case PK.PFWD:
          if (vvt.reciprocal && vvt.reciprocal.type != "unreachable") {
            vvt = vvt.reciprocal
            list.push(vvt)
            break
          } else {
            return { path: list, state: 'incomplete', reason: 'nonconn vport' }
          }
        default:
          return { path: list, state: 'incomplete', reason: 'default switch' }
      }
      // increment to next, 
      ptr += 2
    }
  }

  // tool to find routes *between* two obj... head & tail should be vvts in the same graph, we want to search betwixt, 
  // routes are returned as route objects, and are not added in this fn 
  this.findRoute = (head, tail, log = false) => {
    if (log) console.warn(`FR: searching from ${head.name} to ${tail.name}`, head.route, tail.route)
    // we're going to poke around recursively, but in the cases where we ever exit *up* a bus-drop, 
    // we need to not traverse back *down* that thing... this is that state, and it's a lazy soln', 
    // and if we ever have more than one bus in a net we'll be in trouble w/ this 
    let busDropLatch = 0
    // we... recursively poke around? this is maybe le-difficult, 
    let recursor = (route, from) => {
      if (log) console.warn(`FR: recurse from ${from.name}, logging route:`)
      if (log) PK.logRoute(route)
      // copy...
      route = {
        ttl: route.ttl,
        segSize: route.segSize,
        path: new Uint8Array(route.path)
      }
      // how big ? 
      if (route.path.length > 128) {
        throw new Error(`FR: likely excess recursion here... blocking`)
      }
      // first... look thru siblings at this level, 
      for (let s in from.parent.children) {
        s = parseInt(s)
        let sib = from.parent.children[s]
        if (false) console.warn(`FR: eval ${sib.name}, ${tail.name}`)
        // if that's the ticket, ship it, 
        if (PK.routeMatch(sib.route, tail.route)) {
          if (log) console.warn(`FR: found the target !`)
          return PK.route(route).sib(s).end()
        }
      }
      // if not, find ports, 
      let results = []
      for (let s in from.parent.children) {
        s = parseInt(s)
        let sib = from.parent.children[s]
        if (sib.type == VT.VPORT && sib != from) {
          if (sib.reciprocal && sib.reciprocal.type != "unreachable") {
            // we push potential results into this collection of results & then pass them back up,
            // there's likely a better way to cancel the recursing once we find a match 
            // as a warning... this is not loop safe ! 
            results.push(recursor(PK.route(route).sib(s).pfwd().end(), sib.reciprocal))
          }
        } else if (sib.type == VT.VBUS) {
          if (sib.ownRxAddr == 0) { // -------------------- it's the bus head  
            for (let d in sib.reciprocals) {
              // don't go back down to from whence we came, 
              if (parseInt(d) == busDropLatch) continue
              // traverse down all other reachable drops... 
              if (sib.reciprocals[d].type != "unreachable") {
                results.push(recursor(PK.route(route).sib(s).bfwd(parseInt(d)).end(), sib.reciprocals[d]))
              }
            }
          } else { // ------------------------------------- it's a bus drop, 
            // only come back up if we haven't already come *up* from a drop once before 
            if (busDropLatch) {
              if (log) console.warn(`FR: latch prevented up-bus traversal`)
              continue
            }
            // otherwise, we want to pop up to the head, like 
            if (log) console.warn(`FR: popping up to the bus-head from '${sib.parent.name} / ${sib.name}' at bus addr ${sib.ownRxAddr}`)
            busDropLatch = sib.ownRxAddr
            results.push(recursor(PK.route(route).sib(s).bfwd(0).end(), sib.reciprocals[0]))
          }
        }
      }
      // done children-sweep, now look for matches, should only be one... 
      for (let res of results) {
        if (res != null) return res
      }
      // these are dead-ends in the recursion 
      // console.log('returning null...')
      return null
    } // end recursor 
    // start recursor w/ initial route-to-self, 
    return recursor(PK.route().end(), head)
  }
}