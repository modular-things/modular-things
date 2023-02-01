/*
osapQuery.js

resolves remote data for local code 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2021

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { VT, EP } from './ts.js'
import TIME from './time.js'
import PK from './packets.js'
import Vertex from './vertex.js'

export default class Query extends Vertex {
  constructor(parent, indice, route, retries) {
    super(parent, indice)
    this.route = route
    this.maxRetries = retries 
  }

  type = VT.QUERY
  
  // ---------------------------------- Some State, as a Treat 

  queryAwaiting = null 
  runningQueryID = 101

  // ---------------------------------- Reply Catch Side 

  destHandler = function (item, ptr) {
    // again, item.data[ptr] == PK.PTR, ptr + 1 = PK.DEST, ptr + 2 = EP.QUERY_RES,
    switch (item.data[ptr + 2]) {
      case EP.QUERY_RES:
        // ... if i.e. phy throws a second paquet, and we try to catch another 
        // query, but we already caught the second paquet, we have an issue here
        // one op (better) is to have PHYs that don't send packets twice (?) 
        try {
          // match & bail 
          if(this.queryAwaiting.id == item.data[ptr + 3]){
            clearTimeout(this.queryAwaiting.timeout)
            for(let res of this.queryAwaiting.resolutions){
              res(new Uint8Array(item.data.subarray(ptr + 4)))
            }
            this.queryAwaiting = null 
          } else {
            console.error('on query reply, no matching resolution')
          }
        } catch (err) {
          console.warn(`mystery query err...`, err)
          this.queryAwaiting = null 
        }
        break;
      default:
        console.error('root recvs data / not query resp')
    }
    item.handled() 
  }

  // ---------------------------------- Issuing Side 

  pull = () => {
    return new Promise((resolve, reject) => {
      if (this.queryAwaiting) {
        this.queryAwaiting.resolutions.push(resolve)
      } else {
        let queryID = this.runningQueryID 
        this.runningQueryID ++; this.runningQueryID = this.runningQueryID & 0b11111111; 
        let datagram = PK.writeDatagram(this.route, new Uint8Array([PK.DEST, EP.QUERY, queryID]))
        this.queryAwaiting = {
          id: queryID,
          resolutions: [resolve],
          retries: 0,
          timeoutFn: () => {
            if(this.queryAwaiting.retries >= this.maxRetries){
              this.queryAwaiting = null
              reject(`query timeout after ${this.maxRetries} retries`)  
            } else {
              console.warn(`query retry`)
              this.queryAwaiting.retries ++ 
              this.handle(datagram, VT.STACK_ORIGIN)
              this.queryAwaiting.timeout = setTimeout(this.queryAwaiting.timeoutFn, TIME.staleTimeout)
            }
          }
        } // end query obj 
        // set 1st timeout, 
        this.queryAwaiting.timeout = setTimeout(this.queryAwaiting.timeoutFn,TIME.staleTimeout)
        // parent handles,
        this.handle(datagram, VT.STACK_ORIGIN)
      }
    })
  }
}