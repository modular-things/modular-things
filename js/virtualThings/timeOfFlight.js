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

let N_PADS = 6

export default function(osap, vt, name) {

  let routeToFirmware = PK.VC2VMRoute(vt.route)
  let tofQuery = osap.query(PK.route(routeToFirmware).sib(1).end());

  const setup = async () => { }

  return {
    readDistance: async (index) => {
      try {
        let data = await tofQuery.pull();
        let vals = [];
        for(let p = 0; p < N_PADS; p ++) {
          vals.push(TS.read("uint16", data, p * 2))
        }
        return vals[index];
      } catch (err) {
        console.error(err)
      }
    },
    setup,
    vt,
  }
}