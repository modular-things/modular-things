// osapjs/port_integrations/autoRPCCaller.ts
// talks to an rpc implementer port, collects function info and 
// implements that function in js 

import Runtime from "../runtime";
import Port from "../structure/ports";
import Route from "../packets/routes";
import { PortTypeKeys } from "../utils/keys";

import SequentialIDResolver from "../utils/sequentialIDResolver";

let AutoRPCKeys = {
  SignatureRequest: 1,
  SignatureResponse: 2,
  FunctionCall: 3,
  FunctionReturn: 4,
}

export default class AutoRPCCaller {
  private port: Port;
  private resolver = new SequentialIDResolver();
  // each is attached to a particular port / device:
  private implementerRoute: Route
  private implementerPort: number 
 

  constructor(runtime: Runtime, routeToImplementer: Route, implementerPort: number) {
    this.port = runtime.port();
    this.port.typeKey = PortTypeKeys.AutoRPCCaller;
    // savesies 
    this.implementerPort = implementerPort;
    this.implementerRoute = routeToImplementer;
    // attach the attacher, hah 
    this.port.onData((data, sourceRoute, sourcePort) => {
      this.resolver.find(data, 1);
    })
  }

  setup = async () => {
    await this.port.awaitCTS();
    // firstly we need to collect that info: 
    // let's get the spec out... 
    let sigReqDG = new Uint8Array(2);
    sigReqDG[0] = AutoRPCKeys.SignatureRequest;
    sigReqDG[1] = this.resolver.writeNew();
    // send that, and await the resolution to that msg id in [1];
    this.port.send(sigReqDG, this.implementerRoute, this.implementerPort);
    let res = await this.resolver.request(sigReqDG[1], 'signature request');
    console.log(`have the res...`, res);
    // now we should have... the data per that spec, babey 
    // but leaving it off here:
    // TODO: unroll that spec, babey 
    // TODO: serialize chars / everything in embeddedland... 
    return res; 
  }


}