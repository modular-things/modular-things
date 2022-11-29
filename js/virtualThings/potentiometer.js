/*
rgbbThing.js

a "virtual thing" - of course 

Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS } from "../osapjs/core/ts.js"
import PK from "../osapjs/core/packets.js"

export default function(osap, vt, name) {

  // ---------------------------------- OSAP... stuff, 
  let routeToFirmware = PK.VC2VMRoute(vt.route)

  // this is the '1th' vertex, so we address it like-this:
  let potQuery = osap.query(PK.route(routeToFirmware).sib(1).end());


  return {
    readPotentiometer: async (index) => {
      const data = await potQuery.pull();
      const val0 = TS.read("uint16", data, 0);
      const val1 = TS.read("uint16", data, 2);
      const vals = [ val0, val1 ];
      return vals[index];
    },
    setup: () => {},
    vt,
  }
}