/*

maxl-stepper.ts

motion control output device 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

*/

import { osap } from "../../osapjs/osap"
import Serializers from "../../osapjs/utils/serializers"
import Time from "../../osapjs/utils/time"

export default function maxlStepper(name: string) {
  // motor specific settings... 
  let settings = {
    currentScale: 0.0
  }

  let publishSettings = async () => {
    let datagram = new Uint8Array(4);
    let wptr = 0;
    wptr += Serializers.writeFloat32(datagram, wptr, settings.currentScale);
    await osap.send(name, "writeMotorSettings", datagram);
  }

  let getLimitState = async () => {
    let res = await osap.send(name, "getLimitState", new Uint8Array([0]));
    return res[0] ? true : false;
  }

  return {
    // IMO these two should be modular-things core, 
    // and maybe these should be classes (?) 
    updateName: (newName: string) => {
      name = newName;
    },
    getName: () => { return name },
    setCurrentScale: async (currentScale: number) => {
      settings.currentScale = currentScale;
      await publishSettings();
    },
    getLimitState,
    api: [], // TBD 
  }
}