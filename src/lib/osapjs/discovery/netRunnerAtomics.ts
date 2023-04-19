// a utility / the serialization pain-in-the-ass backend for the netrunner,

import Runtime from "../runtime";
import Route from "../packets/routes"
import Packet from "../packets/packets";
import { BuildTypeKeys, PortTypeKeys, LGatewayTypeKeys, TransportKeys, keyToString } from "../utils/keys";
import Serializers from "../utils/serializers";
import SequentialIDResolver from "../utils/sequentialIDResolver";

export type PortInfo = {
  typeName: string;
  name: string,
}

export type LGatewayInfo = {
  typeName: string;
  isOpen: boolean;
}

export type RuntimeInfo = {
  route: Route;
  build: string;
  version: string;
  previousTraverseID: Uint8Array;
  entryInstruction: Uint8Array;
  portCount: number;
  linkGatewayCount: number;
  busGatewayCount: number;
}

export default class NetRunnerAtomics {
  // to gen / get msgs from 
  runtime: Runtime;
  // to resolve with 
  resolver = new SequentialIDResolver();
  // uuuh
  constructor(runtime: Runtime) {
    this.runtime = runtime;
  }

  // -------------------------------------------- Graph Discovery Atomics 

  // retrieve rutime-info-brief from a device, 
  getRuntimeInfo = async (route: Route, traverseID?: Uint8Array): Promise<RuntimeInfo> => {
    try {
      // no-ops before available space, 
      await this.runtime.awaitStackSpace();
      // write and ship a runtimeinfo request, easy easy, 
      let requestID = this.resolver.writeNew();
      let dg = new Uint8Array([TransportKeys.RUNTIMEINFO_REQ, requestID, 0, 0, 0, 0]);
      // write the traverse-id in at [2]: note that `requestID` lets us demux the 
      // res to this req, and the `traverseID` is used one layer up in graph reconstruction 
      if (!traverseID) traverseID = new Uint8Array([0, 0, 0, 0])
      dg.set(traverseID, 2);
      // load the packet into the stack, and have it handled (transmitted) 
      this.runtime.stack.push(Packet.deviceToDevice(this.runtime, route, dg));
      this.runtime.requestLoopCycle();
      // this will hang here until we get a resolution... 
      let res = await this.resolver.request(requestID, 'getRuntimeInfo');
      console.warn(`res`, res)
      // now we would demux res and return the obj, 
      return {
        route,
        previousTraverseID: new Uint8Array([res[2], res[3], res[4], res[5]]),
        build: keyToString(res[6], BuildTypeKeys),
        version: `${res[7]}.${res[8]}.${res[9]}`,
        entryInstruction: new Uint8Array([res[10], res[11], res[12], res[13], res[14]]),
        portCount: Serializers.readUint16(res, 15),
        linkGatewayCount: Serializers.readUint16(res, 17),
        busGatewayCount: Serializers.readUint16(res, 19),
      }
    } catch (err) {
      throw err;
    }
  } // end getRuntimeInfo

  getPortInfo = async (route: Route, startIndex: number, endIndex: number): Promise<PortInfo[]> => {
    try {
      // no-ops before available space:
      await this.runtime.awaitStackSpace();
      // similar to the above... 
      let id = this.resolver.writeNew();
      let dg = new Uint8Array([TransportKeys.PORTINFO_REQ, id, 0, 0, 0, 0]);
      Serializers.writeUint16(dg, 2, startIndex);
      Serializers.writeUint16(dg, 4, endIndex);
      // stuff it 
      this.runtime.stack.push(Packet.deviceToDevice(this.runtime, route, dg));
      this.runtime.requestLoopCycle();
      // & wait for resolution:
      let res = await this.resolver.request(id, 'getPortInfo');
      // ayyeee we're doing it again! the weird keys-to-strings thing! 
      let ports = []
      for (let p = 2; p < res.length; p++) {
        ports.push({ typeName: keyToString(res[p], PortTypeKeys), name: '' })
      }
      return ports
    } catch (err) {
      throw err;
    }
  } // end getPortInfo 

  getLGatewayInfo = async (route: Route, startIndex: number, endIndex: number): Promise<LGatewayInfo[]> => {
    try {
      // no-ops before available space:
      await this.runtime.awaitStackSpace();
      // similar to the above... 
      let id = this.resolver.writeNew();
      let dg = new Uint8Array([TransportKeys.LGATEWAYINFO_REQ, id, startIndex, endIndex]);
      // console.warn(`from ${startIndex} : ${endIndex} w/ id ${id}`)
      // stuff it 
      this.runtime.stack.push(Packet.deviceToDevice(this.runtime, route, dg));
      this.runtime.requestLoopCycle();
      // & wait for resolution:
      let res = await this.resolver.request(id, 'getLGatewayInfo');
      // now we demux... one-by-one, data in pairs-of-bytes, 
      let lgateways = []
      for (let l = 2; l < res.length; l += 2) {
        lgateways.push({
          typeName: keyToString(res[l], LGatewayTypeKeys),
          isOpen: res[l + 1] ? true : false,
        })
      }
      return lgateways;
    } catch (err) {
      throw err;
    }
  } // end getLGatewayInfo 

}