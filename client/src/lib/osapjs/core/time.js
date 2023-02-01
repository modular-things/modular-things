/*
times.js

time utilities for OSAP 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

// nice ute for async functions... 
let TIME = {}

let getTimeStamp = null

if (typeof process === 'object') {
  // const { PerformanceObserver, performance } = require('perf_hooks')
  getTimeStamp = () => {
    return performance.now()
  }
} else {
  getTimeStamp = () => {
    return performance.now()
  }
}

TIME.getTimeStamp = () => { return getTimeStamp() }

TIME.staleTimeout = 1000 

TIME.delay = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => { resolve() }, ms)
  })
}

TIME.awaitFutureTime = (systemMs) => {
  return new Promise((resolve, reject) => {
    let check = () => {
      if(TIME.getTimeStamp() >= systemMs){
        resolve()
      } else {
        setTimeout(check, 0)
      }
    } 
    check()
  })
}

export default TIME 