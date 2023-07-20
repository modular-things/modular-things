// opapjs/packets/routes.ts
// reading and writing transport-layer routes 

import Packet from "./packets";

// utes
import Serializers from "../utils/serializers";
import { TransportKeys } from "../utils/keys";

// route-thing, 
export default class Route {
  // the route's path (encoded packet-wise) 
  encodedPath: Uint8Array;
  // maximum packet length along this path, 
  maxSegmentSize: number;
  // time-to-live / priority encoding / scheduling ute, 
  perHopTimeToLive: number;

  // default / direct constructor,
  constructor(encodedPath: Uint8Array, maxSegmentSize: number, perHopTimeToLive: number) {
    this.encodedPath = encodedPath;
    this.maxSegmentSize = maxSegmentSize;
    this.perHopTimeToLive = perHopTimeToLive;
  }

  private static routeEndScan = (packet: Packet): number => {
    // 1st instruction is at pck[5] since we have | PTR | PHTTL:2 | MSS:2 | 
    let end = 5;
    while(true){
      switch(packet.data[end]){
        case TransportKeys.LINKF:
          end += TransportKeys.getIncrement(TransportKeys.LINKF);
          break;
        case TransportKeys.BUSF:
          end += TransportKeys.getIncrement(TransportKeys.BUSF);
          break;
        default:
          // non-route-key, means this is the end: 
          return end;
      }
      if(end > packet.data.length) return packet.data.length;
    }
  }

  // constructor to build routes by pullen 'em from packets, 
  static from = (packet: Packet): Route => {
    // extract MSS and PHTTL from the packet, 
    let perHopTimeToLive = Serializers.readUint16(packet.data, 1);
    let maxSegmentSize = Serializers.readUint16(packet.data, 3);
    // use this ute to find the packet terminus 
    let pathEnd = this.routeEndScan(packet);
    // and resolve a new Route 
    return new Route(packet.data.slice(5, pathEnd), maxSegmentSize, perHopTimeToLive)
  }

  // constructor for blind feed-forward route authorship
  static build = (existing?: Route) => {
    // startup opts, 
    let path = new Uint8Array(256);
    let wptr = 0;
    // copy from existing, 
    if (existing) {
      path.set(existing.encodedPath, 0)
      wptr = existing.encodedPath.length
    }
    // constructor-factory-chaining-thing... 
    return {
      end: function (maxSegmentSize?: number, perHopTimeToLive?: number): Route {
        if (!maxSegmentSize) maxSegmentSize = 256;
        if (!perHopTimeToLive) perHopTimeToLive = 2000;
        // return a complete Route object, 
        return new Route(new Uint8Array(path.subarray(0, wptr)), maxSegmentSize, perHopTimeToLive)
      },
      link: function (index: number) {
        path[wptr++] = TransportKeys.LINKF;
        wptr += Serializers.writeUint16(path, wptr, index);
        return this;
      },
      bus: function (index: number, rxAddress: number) {
        path[wptr++] = TransportKeys.BUSF;
        wptr += Serializers.writeUint16(path, wptr, index);
        wptr += Serializers.writeUint16(path, wptr, rxAddress);
        return this;
      }
    }
  }

  static equality = (a: Route, b: Route) => {
    // easy, 
    if(a.encodedPath.length != b.encodedPath.length) return false;
    // ok then,
    for(let i = 0; i < a.encodedPath.length; i ++){
      if(a.encodedPath[i] != b.encodedPath[i]) return false;
    }
    // finally 
    return true;
  }

  // in-place reverser
  reverse = (): void => {
    // copy-out the old, into a new instance of the TypedArray 
    let oldPath = this.encodedPath.slice();
    // now we can do a little walking... 
    // console.warn(`reversing... length of ${oldPath.length}`)
    // console.log(oldPath)
    // reading from 1st-key in old, writing from back-to-front into new, 
    let rptr = 0;
    let wptr = oldPath.length; 
    while(wptr > 0){
      let increment = TransportKeys.getIncrement(oldPath[rptr])
      wptr -= increment 
      this.encodedPath.set(oldPath.subarray(rptr, rptr + increment), wptr)
      rptr += increment 
    }
  }

  // print-er, 
  print = (): void => {
    let msg = `ROUTE: -------------\n`;
    let rptr = 0;
    while(rptr < this.encodedPath.length){
      switch(this.encodedPath[rptr]){
        case TransportKeys.LINKF:
          msg += `LINKF: ${Serializers.readUint16(this.encodedPath, rptr + 1)}\n`;
          rptr += TransportKeys.getIncrement(this.encodedPath[rptr]);
          break;
        case TransportKeys.BUSF:
          msg += `BUSF: ${Serializers.readUint16(this.encodedPath, rptr + 1)}, ${Serializers.readUint16(this.encodedPath, rptr + 3)}\n`;
          rptr += TransportKeys.getIncrement(this.encodedPath[rptr]);
          break;
        default:
          msg += `BROKEN !\n`
          rptr = this.encodedPath.length;
          break;
      }
    }
    msg += `ENDROUTE: ----------`;
    console.log(msg) 
  }
}