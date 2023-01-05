/*
vport.js

virtual port, for osap

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { VT } from './ts.js'
import Vertex from './vertex.js'

export default class VPort extends Vertex {
  constructor(parent, indice) {
    super(parent, indice)
  }

  /* to implement */
  // write this.cts(), returning whether / not thing is open & clear to send 
  // write this.send(buffer), putting bytes on the line 
  // on data, call this.recieve(buffer) with a uint8array arg 

  name = "unnamed vport"
  maxSegLength = 128
  type = VT.VPORT

  // phy implements these;
  // is the connection open ? link state 
  isOpen = function () { throw new Error(`vport ${this.name} hasn't implemented an isOpen() function`) }
  // is it clear to send ? flow control 
  cts = function () { throw new Error(`vport ${this.name} hasn't implemented a cts() function`) }
  // send this... 
  send = function (buffer) { throw new Error(`vport ${this.name} hasn't implemented a send() function`) }

  // phy uses this on receipt of a datagram, to ingest to OSAP 
  receive = function (buffer) {
    // datagram goes straight through 
    this.handle(buffer, VT.STACK_ORIGIN)
  }

  // rm self from osap instance, 
  dissolve = function () {
    this.parent.children.splice(this.parent.children.findIndex(elem => elem == this), 1)
  }

} // end vPort def
