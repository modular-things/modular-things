// opapjs/port_integrations/deviceNameManager.ts
// collects (and sets) type- and unique-names on remote devices 

import Runtime from "../runtime";
import Port from "../structure/ports";
import Route from "../packets/routes";
import { PortTypeKeys } from "../utils/keys";

import SequentialIDResolver from "../utils/sequentialIDResolver";

import Serializers from "../utils/serializers";

// we could ~ refactor this so that there's just one 
// per osap-instance, rather than one per remote device, 
// it doesn't really matter which way we cut it, does it ? 

let DeviceNameKeys = {
  NameGetReq: 1,
  NameGetRes: 2,
  NameSetReq: 3,
  NameSetRes: 4
}

export default class DeviceNameManager {

  private port: Port;
  private resolver = new SequentialIDResolver();

  constructor(runtime: Runtime) {
    // we'll chat w/ this: 
    this.port = runtime.port();
    this.port.typeKey = PortTypeKeys.DeviceNameManager;
    // define it's handler:
    this.port.onData((data, sourceRoute, sourcePort) => {
      // simple randy-id demuxing
      this.resolver.find(data, 1);
    })
  }

  // to get the obj's names... 
  getNames = (route: Route, port: number) => {
    return new Promise<{typeName: string, uniqueName: string}>(async (resolve, reject) => {
      try {
        // wait until we're clear... 
        await this.port.awaitCTS()
        // write & tx the packet, using get-key and a randy-id, 
        let dg = new Uint8Array(1 + 4);
        dg[0] = DeviceNameKeys.NameGetReq;
        dg[1] = this.resolver.writeNew();
        // send it, 
        this.port.send(dg, route, port);
        // await res, 
        let res = await this.resolver.request(dg[1], `device getNames request`);
        // ... demux typename, uniquename... 
        let typeName = Serializers.readString(res, 2);
        let uniqueName = Serializers.readString(res, 3 + typeName.length);
        // and resolve w/ those, 
        resolve({ typeName, uniqueName })
      } catch (err) {
        reject(err)
      }
    })
  } // end getNames

  setUniqueName = (route: Route, port: number, name: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // wait for clear.. 
        await this.port.awaitCTS()
        // write & tx the req: key, sequentialID, str, and '\0'
        let dg = new Uint8Array(1 + 1 + name.length + 1);
        dg[0] = DeviceNameKeys.NameSetReq;
        dg[1] = this.resolver.writeNew();
        Serializers.writeString(dg, 2, name);
        // ship it, 
        this.port.send(dg, route, port);
        // await res 
        let res = await this.resolver.request(dg[1], `setUniqueName req '${name}'`)
        // and demux the res, 
        if(res[2] == 1){
          resolve()
        } else {
          reject(`.setUniqueName rx'd a failure code from remote, maybe no on-chip nvm ?`)
        }
      } catch (err) {
        reject(err)
      }
    })
  } // end setUniqueName 

}