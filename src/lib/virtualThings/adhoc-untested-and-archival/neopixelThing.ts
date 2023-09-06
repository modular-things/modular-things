/*

neopixelThing.ts

... led painter for maxl demos ... 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

*/

import { osap } from "../../osapjs/osap"

export default function neopixelThing(name: string){
  return {
    // IMO these two should be modular-things core, 
    // and maybe these should be classes (?) 
    updateName: (newName: string) => {
      name = newName;
    },
    getName: () => { return name },
    api: [], // TBD 
  }
}