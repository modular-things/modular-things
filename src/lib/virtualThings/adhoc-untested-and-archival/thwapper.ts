/*
thwapper.js
Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022
This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { osap } from "../osapjs/osap"

export default function thwapper(name: string){
  // thwap, 
  let thwap = async (note: number, velocity: number) => {
    try{
      let datagram = new Uint8Array([note, velocity])
      // console.log(datagram)
      await osap.send(name, "thwap", datagram)
    } catch (err) {
      console.error(err)
    }
  }
  // ok ok 
  return {
    thwap, 
    updateName: (newName: string) => {
      name = newName;
    },
    api: [
      {
        name: "thwap", 
        args: [
          "key: number", 
          "velocity: number (0-255)"
        ]
      }
    ]
  }
}