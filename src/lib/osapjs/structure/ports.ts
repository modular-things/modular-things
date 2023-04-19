// software thing 
import Runtime from "../runtime";
import Packet from "../packets/packets";
import Route from "../packets/routes";

// port keyeths 
import { PortTypeKeys } from "../utils/keys";

export default class Port {
  // our parent runtime 
  private runtime: Runtime;
  // our own index / port # 
  private index: number;
  // our local message buffer, 
  readonly stack: Packet[] = [];
  private stackMaxLength = 4;
  // we should let users increase this though 
  setMaxStackLength = (len: number) => {
    // not too deep or too shallow, 
    if (len < 1) len = 1;
    if (len > 64) len = 64;
    // ok, 
    this.stackMaxLength = len;
  }
  getMaxStackLength = () => {
    return this.stackMaxLength;
  }

  // every port has a type-key, 
  typeKey = PortTypeKeys.Naked;

  // `new Port` is called via osap.port() 
  constructor(runtime: Runtime, index: number) {
    this.runtime = runtime;
    this.index = index;
  }

  // ------------------------ User / Extender API 
  // send msgs,
  send = (data: Uint8Array, route: Route, destinationPort: number): void => {
    // we'll probably want a pretty good error message here: 
    if (!this.clearToSend()) throw new Error(`port.send() called on over-full port`)
    // let's write a port-to-port packet, 
    this.stack.push(Packet.portToPort(this, route, destinationPort, data))
    // request loops, 
    this.runtime.requestLoopCycle();
  }

  // check if clear, 
  clearToSend = (): boolean => {
    return (this.stack.length < this.stackMaxLength);
  }

  // use async-check-if-clear, 
  awaitCTS = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let check = () => {
        if (this.clearToSend()) {
          resolve()
        } else {
          setTimeout(check, 0)
        }
      }
      check()
    })
  }

  // attach a data handler, 
  onData = (func: (data: Uint8Array, sourceRoute: Route, sourcePort: number) => void) => {
    // console.warn(`attaching handler`, func)
    this.onDataCallback = func
  }

  // ------------------------ Runtime API 
  // runtime calls this directly, 
  onDataCallback = (data: Uint8Array, sourceRoute: Route, sourcePort: number): void => {
    console.warn(`firing the default onDataHandler with ${data.length} bytes`)
    // console.warn(data)
    // console.warn(sourceRoute)
    // console.warn(sourcePort)
  }

  // API used by transport layer, 
  getPacketsToService = (): Packet[] => {
    // we can simply hand it over, 
    return this.stack;
  }

  getIndex = (): number => {
    return this.index;
  }
}

