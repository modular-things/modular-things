/*
osapQueryMSeg.js

resolves remote data for local code, big chonkers 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { EPMSEG, TS, EP } from './ts.js'
import Vertex from './vertex.js'

export default class QueryMSeg extends Vertex {
  constructor(parent, indice, route, retries) {
    super(parent, indice)
    this.route = route 
    this.maxRetries = retries 
  }

  // ---------------------------------- Catch Side 

  destHandler = function (item, ptr) {
    let data = item.data 
    let startByte = 0
    let endByte = 0 
    let terminal = false 
    ptr += 3 
    switch(data[ptr]){
      case EPMSEG.QUERY_END_RESP:
        terminal = true 
      case EPMSEG.QUERY_RES:
        // bytes -> bytes 
        startByte = TS.read('uint16', data, ptr + 1)
        endByte = TS.read('uint16', data, ptr + 3)
        //console.log(startByte, endByte)
        if(startByte == 0) this.tempData = [] 
        let i = 0 
        for(let b = startByte; b < endByte; b ++){
          this.tempData[b] = data[ptr + 5 + (i ++)]
        }
        if(!terminal){
          this.reqNewSeg(endByte)
          clearTimeout(this.rejectTimeout)
          this.rejectTimeout = setTimeout(() => {this.pullReject('mseg timeout')}, 1000)
        } else {
          this.pullResolve(this.tempData)
          clearTimeout(this.rejectTimeout)
        }
    }
    return true 
  }

  tempData = {}

  reqNewSeg = (start) => {
    //console.log(`req at ${start}`)
    // len is [route][querykey][start:2][end:2]
    let req = new Uint8Array(this.route.length + 5)
    req.set(this.route, 0)
    let wptr = this.route.length 
    req[wptr ++] = EPMSEG.QUERY;
    wptr += TS.write('uint16', start, req, wptr)
    wptr += TS.write('uint16', start + 64, req, wptr)
    this.handle(req, 0)
  }

  pullResolve = null 
  pullReject = null 
  rejectTimeout = null 

  pull = () => {
    return new Promise((resolve, reject) => {
      this.pullResolve = resolve 
      this.pullReject = reject 
      this.reqNewSeg(0)
      this.rejectTimeout = setTimeout(() => {this.pullReject('mseg timeout')}, 1000)
    })
  }
}