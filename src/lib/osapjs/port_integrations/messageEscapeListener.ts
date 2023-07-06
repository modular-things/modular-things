

import Runtime from "../runtime";
import Port from "../structure/ports";
import Route from "../packets/routes";

import { PortTypeKeys } from "../utils/keys";
import Serializers from "../utils/serializers";

let KEYS = {
  RouteSet: 44,
  Msg: 77,
}

export default class MessageEscapeListener {

  private port: Port;
  private name: string = "unnamed";

  constructor(runtime: Runtime) {
    this.port = runtime.port();
    this.port.typeKey = PortTypeKeys.MessageEscapeListener;
    // listener, 
    this.port.onData((data) => {
      if(data[0] != KEYS.Msg){
        console.error(`rx'd a msg at this escape-listener w/ bad 1st byte...`)
      } else {
        let msg = Serializers.readString(data, 1);
        console.warn(`ESC: ${this.name}: ${msg}`)
      }
    })
  }

  // uuuh, we tx once, they setup to reply to whence-from-rx'd 
  begin = async (remote: Route, partner: number, name?: string) => {
    // name self
    if (name) this.name = name;
    // tx once to say hello 
    let datagram = new Uint8Array([KEYS.RouteSet]);
    this.port.send(datagram, remote, partner);
  }

}