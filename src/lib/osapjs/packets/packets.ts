// opapjs/packets/packets.ts
// reading and writing packets 
// also, the packet type, which we use extensively in the runtime 

// classes 
import Route from "./routes";
import Runtime from "../runtime";
import Port from "../structure/ports";
import Link from "../structure/lGateways";

// utes
import { TransportKeys } from "../utils/keys";
import Serializers from "../utils/serializers";
import Time from "../utils/time";

// packet-thing, 
export default class Packet {
  // packet origin 
  source: Port | Runtime | Link;
  // underlying packet 
  data: Uint8Array;
  // time after-which packet is RIP 
  serviceDeadline = 0;

  // ---------------------------------- Constructors 

  // raw constructor 
  constructor(source: Port | Runtime | Link, data: Uint8Array, serviceDeadline: number) {
    this.source = source;
    this.data = data;
    this.serviceDeadline = serviceDeadline;
  }

  private static stuffRoute = (pck: Uint8Array, route: Route):number => {
    // the pointer is always initialized at 5, 
    //                            V
    // | PTR | PHTTL:2 | MSS: 2 | 1ST_INSTRUCT 
    pck[0] = 5;
    // per hop time-to-live and maximum segment size are written in, 
    Serializers.writeUint16(pck, 1, route.perHopTimeToLive);
    Serializers.writeUint16(pck, 3, route.maxSegmentSize);
    // the route is written in, 
    pck.set(route.encodedPath, 5);
    // return the end-of-route, 
    return route.encodedPath.length + 5;
  }

  // write port-to-port packets, 
  static portToPort = (source: Port, route: Route, destinationPort: number, data: Uint8Array): Packet => {
    // calculate and check final data length 
    let packetLength = 5 + route.encodedPath.length + 5 + data.length;
    if (packetLength > route.maxSegmentSize) throw new Error(`attempt to wite packet of length ${packetLength} along a route with maximum ${route.maxSegmentSize}`);
    // setup the datagram 
    let pck = new Uint8Array(packetLength);
    // now we need a write pointer, 
    let routeEnd = this.stuffRoute(pck, route);
    // port key and src, dest port nums written in, 
    pck[routeEnd] = TransportKeys.PORTPACK;
    Serializers.writeUint16(pck, routeEnd + 1, source.getIndex())
    Serializers.writeUint16(pck, routeEnd + 3, destinationPort)
    // finally write the ahktual data
    pck.set(data, routeEnd + 5)
    // use global-object timestamp-getter to determine the service deadline, 
    let serviceDeadline = route.perHopTimeToLive + Time.getTimeStamp();
    // and return the packet-object, 
    return new Packet(source, pck, serviceDeadline)
  }

  // write device-to-device packets, 
  static deviceToDevice = (source: Runtime, route: Route, data: Uint8Array): Packet => {
    // as above, 
    let packetLength = 5 + route.encodedPath.length + data.length;
    if(packetLength > route.maxSegmentSize) throw new Error(`attempt to wite packet of length ${packetLength} along a route with maximum ${route.maxSegmentSize}`);
    // setup the gram 
    let pck = new Uint8Array(packetLength)
    // as above, again, 
    let routeEnd = this.stuffRoute(pck, route);
    // and now omitting the PORTPACK from above, 
    pck.set(data, routeEnd)
    // use global-object timestamp-getter to determine the service deadline, 
    let serviceDeadline = route.perHopTimeToLive + Time.getTimeStamp();
    // and return the packet-object, 
    return new Packet(source, pck, serviceDeadline);
  }

  // ingest a link packet, 
  static external = (source: Link, pck: Uint8Array): Packet => {
    // phttl is stuck right in the front of each packet, 
    let perHopTimeToLive = Serializers.readUint16(pck, 1)
    // console.warn(`writing-in pck from external, PHTTL is ${perHopTimeToLive}ms`)
    // link-code has done most of the work... 
    return new Packet(source, pck, perHopTimeToLive + Time.getTimeStamp());
  }

  // ---------------------------------- Packet Methods 

  // self-deletion from source array, 
  delete = (): void => {
    // find ourselves in the source's stack and rm self, 
    for (let i = 0; i < this.source.stack.length; i++) {
      if (this.source.stack[i] == this) {
        this.source.stack.splice(i, 1);
        return;
      }
    }
    // end-of-search and no packet matching found, probably a big fuckup, 
    throw new Error(`a likely double-deletion of this packet has occurred... check runtime...`);
  }

}