/*

bed-heater.ts

fdm machine bed heater 
could be generic for heaters, isn't 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

*/

import { osap } from "../osapjs/osap";
import Serializers from "../osapjs/utils/serializers";

/*
typedef struct pid_heater_config_t {
  // loop period, (sets timing as-well)
  float delT = 0.01F; 
  // pid values, 
  float pTerm = 0.20F;
  float iTerm = 0.0025F;
  float iLim = 50.0F;
  float dTerm = 0.04F;
  // filter settings 
  float tempAlpha = 0.05F;
} pid_heater_config_t;
*/

type HeaterConfig = {
  delT: number,
  pTerm: number,
  iTerm: number,
  iLimit: number,
  dTerm: number,
  tempAlpha: number
}

type HeaterStates = {
  setPoint: number,
  tempEstimate: number,
  errEstimate: number,
  errEstimateLast: number,
  errIntegral: number,
  output: number,
  pContrib: number,
  iContrib: number,
  dContrib: number,
}

export default function hotend(name: string) {
  return {
    updateName: (newName: string) => {
      name = newName;
    },
    getName: () => { return name },
    setTemperature: async (temp: number) => {
      let dg = new Uint8Array(4);
      Serializers.writeFloat32(dg, 0, temp);
      await osap.send(name, "writeHeaterSetPoint", dg);
    },
    setConfig: async (config: HeaterConfig) => {
      let dg = new Uint8Array(6 * 4);
      Serializers.writeFloat32(dg, 0, config.delT);
      Serializers.writeFloat32(dg, 4, config.pTerm);
      Serializers.writeFloat32(dg, 8, config.iTerm);
      Serializers.writeFloat32(dg, 12, config.iLimit);
      Serializers.writeFloat32(dg, 16, config.dTerm);
      Serializers.writeFloat32(dg, 20, config.tempAlpha);
      await osap.send(name, "writeHeaterConfig", dg);
    },
    getStates: async (): Promise<HeaterStates> => {
      // is the 0-len packet really necessary ?
      let res = await osap.send(name, "getHeaterStates", new Uint8Array([0]))
      let states = {
        setPoint: Serializers.readFloat32(res, 0),
        tempEstimate: Serializers.readFloat32(res, 4),
        errEstimate: Serializers.readFloat32(res, 8),
        errEstimateLast: Serializers.readFloat32(res, 12),
        errIntegral: Serializers.readFloat32(res, 16),
        output: Serializers.readFloat32(res, 20),
        pContrib: Serializers.readFloat32(res, 24),
        iContrib: Serializers.readFloat32(res, 28),
        dContrib: Serializers.readFloat32(res, 32),
      }
      return states;
    },
    setPCF: async (duty: number) => {
      let dg = new Uint8Array(4);
      Serializers.writeFloat32(dg, 0, duty);
      await osap.send(name, "setPCFSpeed", dg);
    },
    api: [
      {
        name: "getStates",
        args: [],
        // return: "states"
      },
      {
        name: "setTemperature",
        args: ["temp: num"]
      },
      {
        name: "setConfig",
        args: ["config: {delT, pTerm, iTerm, iLimit, dTerm, tempAlpha}"]
      }
    ]
  }
}