// opapjs/osap.ts
// central-nugget, osap.ts instantiates a runtime 
// and exposes a few factories and core utilities 

import Runtime from "./runtime"
import Route from "./packets/routes"
import NamedPortDispatcher from "./port_integrations/namedPortDispatcher";
import MessageEscapeListener from "./port_integrations/messageEscapeListener";
import OnePipeListener from "./port_integrations/onePipeListener";
import AutoRPCCaller from "./port_integrations/autoRPCCaller";

// largely a bundling class, 
class OSAP {
  // noop constructor 
  constructor() {};
  // we have a runtime, 
  private rt = new Runtime();

  // now we can intelligently expose things... 
  port = this.rt.port;
  linkGateway = this.rt.linkGateway;

  messageEscapeListener = () => {
    return new MessageEscapeListener(this.rt);
  }

  onePipeListener = () => {
    return new OnePipeListener(this.rt);
  }

  autoRPCCaller = (routeToImplementer: Route, implementerPort: number) => {
    return new AutoRPCCaller(this.rt, routeToImplementer, implementerPort);
  }

  // and search algos... 
  // these three... we might not really need to expose 
  getRemoteRuntimeInfo = this.rt.netRunner.atomics.getRuntimeInfo;
  getRemoteLGatewayInfo = this.rt.netRunner.atomics.getLGatewayInfo;
  getRemotePortInfo = this.rt.netRunner.atomics.getPortInfo;

  // or the big global:
  updateMap = async () => {
    try {
      // get a new map of just-the-graph, 
      let map = await this.rt.netRunner.getSystemMap();
      console.warn(`rx'd a system map...`, JSON.parse(JSON.stringify(map)));
      // grab names for each of those objects... 
      let namedMap = await this.dispatcher.fillMapNames(map);
      console.warn(`rx'd a named map...`, JSON.parse(JSON.stringify(namedMap)))
      // return to user as a bonus 
      return namedMap;
    } catch (err) {
      throw err;
    }
  }

  // we have a dispatcher here to send messages via strings, 
  private dispatcher = new NamedPortDispatcher(this.rt);

  send = this.dispatcher.send;
  rename = this.dispatcher.rename;

  // we *could* do an explicit-route overloading of this send func, as below, 
  // but I think I prefer the clarity: if you want to use `Route, Number` addressing, do it 
  // by implementing a port... 
  // send = (device: Route | string, port: number | string, data: Uint8Array): Promise<void | Uint8Array> => {
  //   return new Promise(async (resolve, reject) => {
  //     // let's say... string, string, or Route, number only for now:
  //     if(typeof device == 'string' && typeof port == 'string'){
  //       return this.dispatcher.send(device, port, data);
  //     } else if (typeof device == 'object' && typeof port == 'number'){
  //       try {
  //         await this.nakedPort.awaitCTS();
  //         this.nakedPort.send(data, device, port);
  //         resolve();
  //       } catch (err) {
  //         reject(err)
  //       }
  //     } else {
  //       reject(`please only use .send(deviceName: string, portName: string, data: Uint8Array) or .send(device: Route, port: number, data: Uint8Array)...`)
  //     }
  //   })
  // }

  // or we could write utilities: i.e. this.ping => (route):number {} to use 
  // a runtimeinfo() packet-return-time... etc 
}

let osap = new OSAP()

// we export the Route as well so that folks can have that API... 
export { osap, Route }