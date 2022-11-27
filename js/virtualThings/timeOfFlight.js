/*
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

  let routeToFirmware = PK.VC2VMRoute(vt.route);
  let tofQuery = osap.query(PK.route(routeToFirmware).sib(1).end());
  // why not just an endpoint?

  const setup = async () => { }

  return {
    readDistance: async () => {
      try {
        const data = await tofQuery.pull();
        // could be
        // data.read("uint16");
        const val = TS.read("uint16", data, 0);
        return val;
      } catch (err) {
        console.error(err)
      }
    },
    setup,
    vt,
  }
}