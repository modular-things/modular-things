

import Runtime from "../runtime";
import Port from "../structure/ports";
import Route from "../packets/routes";

import { PortTypeKeys } from "../utils/keys";
import Serializers from "../utils/serializers";

let KEYS = {
  Setup: 44,
  SetupRes: 45,
  Msg: 77,
}

export default class OnePipeListener {

  private port: Port;
  private remoteDeviceName: string = "unnamed";

  // the name... of the pipe (source) 
  name: string = "";

  private subdFunc = null;

  constructor(runtime: Runtime) {
    this.port = runtime.port();
    this.port.typeKey = PortTypeKeys.OnePipeListener;
    // listener, 
    this.port.onData((data) => {
      switch(data[0]){
        case KEYS.Msg:
          // console.warn(`PIPE: ${this.remoteDeviceName}`, data)
          if(this.subdFunc){
            this.subdFunc(data.slice(1));
          }
          break;
        case KEYS.SetupRes:
          // console.warn(`PIPE RES:`, data)
          this.name = Serializers.readString(data, 1);
          break;
        default:
          console.error(`rx'd a msg at this escape-listener w/ bad 1st byte...`)
          break;
      }
    })
  }

  // uuuh, we tx once, they setup to reply to whence-from-rx'd 
  begin = async (remote: Route, partner: number, name?: string) => {
    // name self
    if (name) this.remoteDeviceName = name;
    // tx once to say hello and retrieve our incoming source-name... 
    await this.port.awaitCTS();
    let datagram = new Uint8Array([KEYS.Setup]);
    this.port.send(datagram, remote, partner);
    // we should resolve once we actually have the reply... 
    return new Promise<void>((resolve, reject) => {
      let check = () => {
        if(this.name == ""){
          setTimeout(check, 10);
        } else {
          console.warn(`PIPE NAME ${this.name}`)
          resolve() 
        }
      }  
      check()
    })
  }

  // to sub to... 
  subscribe = (func: any) => {
    this.subdFunc = func;
  }

}