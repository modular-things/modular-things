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
  let accGyroQuery = osap.query(PK.route(routeToFirmware).sib(1).end());

  const setup = async () => { }

  return {
    readAccGyro: async () => {
      try {
        const data = await accGyroQuery.pull();
        // console.log(data);
        // data.read("float32")
        const x = TS.read("int16", data, 0);
        const y = TS.read("int16", data, 2);
        const z = TS.read("int16", data, 4);
        const xTheta = TS.read("int16", data, 6);
        const yTheta = TS.read("int16", data, 8);
        const zTheta = TS.read("int16", data, 10);
        return [x, y, z, xTheta, yTheta, zTheta];
      } catch (err) {
        console.error(err);
      }
    },
    setup,
    vt,
  }
}