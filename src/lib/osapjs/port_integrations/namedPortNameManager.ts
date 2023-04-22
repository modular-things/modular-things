// gets fancy-port names 

import Runtime from "../runtime";
import Port from "../structure/ports";
import Route from "../packets/routes";
import { PortTypeKeys } from "../utils/keys";

import SequentialIDResolver from "../utils/sequentialIDResolver";

import Serializers from "../utils/serializers";

let NamedPortKeys = {
  NameReq: 1,
  NameRes: 2,
  MSG: 3,
  ACK: 4,
}

class NamedPortNameManager {

  private port: Port;
  private resolver = new SequentialIDResolver();

  constructor (runtime: Runtime) {
    this.port = runtime.port();
    this.port.typeKey = PortTypeKeys.FancyNameManager;
    this.port.onData((data) => { // func additionally provides sourceRoute and sourcePort, we ignore 
      this.resolver.find(data, 1);
    })
  }

  getName = (route: Route, port: number) => {
    return new Promise<string>(async (resolve, reject) => {
      try {
        // wait for space 
        await this.port.awaitCTS();
        // write the request
        let dg = new Uint8Array([NamedPortKeys.NameReq, this.resolver.writeNew()]);
        // send the request 
        this.port.send(dg, route, port);
        // await a response 
        let res = await this.resolver.request(dg[1], `port getName request`);
        // deserialize and return the result 
        resolve(Serializers.readString(res, 2));
      } catch (err) {
        reject(err)
      }
    })
  }

}

export { NamedPortKeys, NamedPortNameManager }