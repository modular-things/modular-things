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

  const routeToFirmware = PK.VC2VMRoute(vt.route)
  const oledEndpointMirror = osap.endpoint("oledEndpointMirror")
  oledEndpointMirror.addRoute(PK.route(routeToFirmware).sib(1).end());

  const setup = async () => { }

  return {
    writeText: async (text, textSize=2) => {
      try {
        const utf8Encode = new TextEncoder();
        const datagram_txt = utf8Encode.encode(text);
        const datagram = new Uint8Array(datagram_txt.length+1);
        datagram[0] = textSize;

        for (let i=0; i < datagram_txt.length; i++) {
          datagram[i+1] = datagram_txt[i];
        }

        console.log(datagram);

        await oledEndpointMirror.write(datagram, "acked");
      } catch (err) {
        console.error(err);
      }
    },
    // writeBuffer: async (buf) => {
    //   try {
    //     // const datagram = new Uint8Array(10);
    //     await oledEndpointMirror.write(buf, "acked");
    //   } catch (err) {
    //     console.error(err);
    //   }
    // },
    setup,
    vt,
    api: [
      {
        name: "writeText",
        args: [
          "text: string",
          "textSize=2: 1 to 16"
        ]
      }
      // {
      //   name: "writeBuffer",
      //   args: [
      //     "buffer: Uint*Array(160 x 128)"
      //   ]
      // }
    ]
  }
}
