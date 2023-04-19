// TODO: header comments... ?? 

// classes 
import Port from "./structure/ports";
import LGateway from "./structure/lGateways";
import Packet from "./packets/packets";
import Route from "./packets/routes";

// utes 
import { BuildTypeKeys, LGatewayTypeKeys, PortTypeKeys, TransportKeys } from "./utils/keys";
import Serializers from "./utils/serializers";
import Time from "./utils/time";
import NetRunner from "./discovery/netRunner";

export default class Runtime {
  // we have ourselves a netrunner, 
  // this is the discovery-messaging-issuing-class, 
  netRunner = new NetRunner(this);
  // noop ?
  constructor() { };

  // version... 
  private version = "0.4.0"

  // stack of runtime's own msgs, 
  stack: Packet[] = [];
  private stackMaxLength = 8;

  // runtime state, 
  private ports: Array<Port> = [];
  private lGateways: Array<LGateway> = [];

  // internal state 
  private loopTimer: any = null;
  private previousTraverseID: Uint8Array = new Uint8Array([0, 0, 0, 0]);

  // -------------------------------------------- Factories 

  // add a port, 
  port = () => {
    // build a new port w/ ref to this runtime 
    let prt = new Port(this, this.ports.length);
    // stash it & resolve it 
    this.ports.push(prt);
    return prt;
  }

  // add a link, 
  linkGateway = (implementation: {
    isOpen: (() => boolean),
    clearToSend: (() => boolean),
    send: ((data: Uint8Array) => void),
    typeKey: number
  }) => {
    // build a newey,
    let lGateway: LGateway;
    // stash it, in an open slot if we can find one: 
    let lostIndex = this.lGateways.findIndex(cand => cand == undefined);
    if(lostIndex >= 0){
      lGateway = new LGateway(this, lostIndex, implementation);
      this.lGateways[lostIndex] = lGateway;
    } else {
      lGateway = new LGateway(this, this.lGateways.length, implementation)
      this.lGateways.push(lGateway);
    }
    // and add the dissolution function, 
    lGateway.dissolve = () => {
      // get and check an index, 
      let index = this.lGateways.findIndex(cand => cand == lGateway);
      if(index == -1) throw new Error(`mysterious dissolution of non-existent lGateway, tf?`);
      // replace with *nooothing*
      this.lGateways[index] = undefined;
      // if this is in the tail, we should just resize the array also... 
      // ~ should trigger an update, maybe ? but... nah, that's application code, innit ? 
      console.log(`after dissolve of ${index}, `, this.lGateways)
    }
    // resolve it 
    return lGateway;
  }

  // -------------------------------------------- Loops, etc... 

  // run the runtime, but only once / js event cycle, 
  requestLoopCycle = () => {
    if (!this.loopTimer) {
      this.loopTimer = setTimeout(this.loop, 0)
    }
  }

  // the core of the runtime: 
  private loop = () => {
    // (0) clear loop timer & check the time,
    this.loopTimer = null
    let now = Time.getTimeStamp()

    // (1) collect packets, 
    let packets: Packet[] = [];
    // from our ports' stacks,
    this.ports.forEach((port) => {
      packets = packets.concat(port.getPacketsToService())
    });

    this.lGateways.forEach((lGateway) => {
      if(lGateway == undefined) return;
      packets = packets.concat(lGateway.getPacketsToService())
    })
    // TODO for(let l in gateways)... 
    // TODO for(let p in devicesOwnStack), FFS 
    // from our own stack,
    packets = packets.concat(this.stack);

    // console.warn(`runtime packets`, packets)
    // console.warn(`now`, now)

    // (2) sort for first service to earliest-deadline message  
    packets.sort((a, b) => {
      return a.serviceDeadline - b.serviceDeadline
    })

    // (3) service each, in order: 
    packets.forEach((packet) => {
      // (3:1) if packet has timed out, wipe it from source stack, 
      if (packet.serviceDeadline < now) {
        console.warn(`timing-out a packet `)
        packet.delete();
        // carry on to next pck, 
        return;
      }

      // (3:2) service each packet, 
      // using instruction-key encoding
      switch (packet.data[packet.data[0]]) {
        // ---------------------------- Forwarding Keys 
        case TransportKeys.PORTPACK:
          {
            // get the source and destination port indices 
            let sourceIndex = Serializers.readUint16(packet.data, packet.data[0] + 1)
            let destinationIndex = Serializers.readUint16(packet.data, packet.data[0] + 3)
            // check if this runtime has one, 
            if (this.ports[destinationIndex]) {
              // pass data 2 the port
              let datagram = packet.data.subarray(packet.data[0] + 5);
              // and the route, using static class func, 
              let route = Route.from(packet);
              // rm packet from sys so that we have always-clear-for-replies guarantee 
              packet.delete();
              // we want to hand the route over in it's reversed state, it's more or less useless otherwise 
              route.reverse();
              // hand it over: software flow control should be application layer (?) 
              this.ports[destinationIndex].onDataCallback(datagram, route, sourceIndex);
            } else {
              // toss it, 
              console.warn(`received a packet for non-existent port ${destinationIndex}, tossing`);
              packet.delete();
            }
          }
          break;
        case TransportKeys.LINKF:
          {
            // can I get an indeeeex
            let index = Serializers.readUint16(packet.data, packet.data[0] + 1);
            // check if we've gottem, 
            if (this.lGateways[index]) {
              if (this.lGateways[index].clearToSend() && this.lGateways[index].isOpen()) {
                // good 2 go, ship it & rip it: 
                this.lGateways[index].send(packet.data);
                packet.delete();
              } else {
                // awaiting... next cycle, make sure it happens: 
                this.requestLoopCycle();
              }
            } else {
              console.warn(`attempted tx along non-existent link-gateway ${index}`, packet.data, packet.source);
              packet.delete();
            }
            // increment pointer & stuff returnal (?) 
            // or does that happen on ingest (?) 
            // send... 
          }
          break;
        // ---------------------------- Bus-Implementer Codes
        case TransportKeys.BUSF:
        case TransportKeys.BGATEWAYINFO_REQ:
          throw new Error(`bus-implementer key found in JS code, no busses here yet`);
          break;
        // ---------------------------- Discovery Keys  
        case TransportKeys.RUNTIMEINFO_REQ:
          {
            // the return message is pretty simple, and is static-length etc 
            let res = new Uint8Array(20);
            // matched response and ID 
            res[0] = TransportKeys.RUNTIMEINFO_RES;
            res[1] = packet.data[packet.data[0] + 1];
            // handoff the traverseID, that's 2:5
            res.set(this.previousTraverseID, 2);
            this.previousTraverseID.set(packet.data.subarray(packet.data[0] + 2, packet.data[0] + 6))
            // stuff our build-type, 
            res[6] = BuildTypeKeys.JavaScript;
            // and version, which we store (in js) as a string, but translate 2 bytes:
            let versionNums = this.version.split(".");
            let versionBytes = versionNums.map(str => parseInt(str));
            res.set(versionBytes, 7);
            // sender needs to know from-whence this packet arrived to us, 
            // we can know this info by whomst-holds-the-packet, or (better)
            // by looking for the instruction-previous-to-the-ptr, 
            // or (check it out), we can get a reversed route, then 
            // check the 1st instruction au-manuel,
            let revRoute = Route.from(packet)
            console.warn(`REQ Route.from()`, JSON.parse(JSON.stringify(revRoute)));
            revRoute.reverse()
            console.warn(`REQ Route.reverse()`, JSON.parse(JSON.stringify(revRoute)));
            // now... this is either empty, linkf, or busf
            // at most it's 5 bytes total, so we're just going to take up 
            // as many each time... 
            if (revRoute.encodedPath.length == 0) {
              // stuff for from-self, so, just pack a buncha zeroes:
              res.set([0, 0, 0, 0, 0], 10);
            } else if (revRoute.encodedPath[0] == TransportKeys.LINKF) {
              // this could just i.e. copy the last-instruction in... 
              res.set(revRoute.encodedPath.subarray(0, 3), 10);
            } else if (revRoute.encodedPath[0] == TransportKeys.BUSF) {
              // busses in JS are unlikely (for now) but this would just do... 
              console.warn(`unfathomable JS-bus-code executing...`)
              res.set(revRoute.encodedPath.subarray(0, 5), 10)
            } else {
              throw new Error(`rx'd an allegedly senseless rtinforeq w/ mystery rx-path ${revRoute.encodedPath[0]}`)
            }
            // port count, link count, and bus count, that's it -> 
            Serializers.writeUint16(res, 15, this.ports.length);
            Serializers.writeUint16(res, 17, this.lGateways.length);
            Serializers.writeUint16(res, 19, 0); //this.busses.length);
            // ship it inline 
            this.reply(packet, res);
          }
          break;
        case TransportKeys.PORTINFO_REQ:
          {
            // get start / end indices... 
            let startIndex = Serializers.readUint16(packet.data, packet.data[0] + 2);
            let endIndex = Serializers.readUint16(packet.data, packet.data[0] + 4);
            // reply...
            let res = new Uint8Array(this.ports.length + 2)
            // key, id, 
            res[0] = TransportKeys.PORTINFO_RES;
            res[1] = packet.data[packet.data[0] + 1];
            // stuff each, 
            for (let p = startIndex; p < endIndex; p++) {
              if (this.ports[p]) {
                res[p + 2] = this.ports[p].typeKey;
              } else {
                res[p + 2] = PortTypeKeys.NULL;
              }
            } // end stuffing 
            // ship it 
            this.reply(packet, res);
          }
          break;
        case TransportKeys.LGATEWAYINFO_REQ:
          {
            // get start / end indices... 
            let startIndex = packet.data[packet.data[0] + 2];
            let endIndex = packet.data[packet.data[0] + 3];
            // formulate a reply...
            // reply...
            let res = new Uint8Array(this.lGateways.length * 2 + 2);
            // key, id, 
            res[0] = TransportKeys.LGATEWAYINFO_RES;
            res[1] = packet.data[packet.data[0] + 1];
            // and stuff each w/ a typekey and state 
            for (let l = startIndex; l < endIndex; l++) {
              if (this.lGateways[l]) {
                res[l * 2 + 2] = this.lGateways[l].typeKey;
                res[l * 2 + 3] = this.lGateways[l].isOpen() ? 1 : 0;
              } else {
                res[l * 2 + 2] = LGatewayTypeKeys.NULL;
                res[l * 2 + 3] = 0;
              }
            }
            // ship it 
            this.reply(packet, res);
          }
          break;
        case TransportKeys.PORTINFO_RES:
        case TransportKeys.RUNTIMEINFO_RES:
        case TransportKeys.LGATEWAYINFO_RES:
        case TransportKeys.BGATEWAYINFO_RES:
          {
            // use the ute, luke
            this.netRunner.atomics.resolver.find(packet.data, packet.data[0] + 1);
            // we have a set of resolvers, need to find a match, 
            // let id = packet.data[packet.data[0] + 1];
            // this.netRunner.atomics.findResolver(id, packet.data.subarray(packet.data[0]));
            // packets always deleted apres-la, 
            packet.delete();
          }
          break;
        default:
          throw new Error(`unlikely packet-key found; "${packet.data[packet.data[0]]}"`);
          break;
      } // end packet switch 
    }) // end packet-list forEach 
  }   // end loop 

  // -------------------------------------------- Device-to-Device Messaging Utes 

  // reply to a d2d message: 
  private reply = (packet: Packet, data: Uint8Array) => {
    // resolve a return route, 
    let route = Route.from(packet);
    route.reverse();
    // delete the og packet from our stack (guaranteeing space for reply) 
    packet.delete();
    // stuff the newy, 
    this.stack.push(Packet.deviceToDevice(this, route, data));
    // get loop time 
    this.requestLoopCycle();
  }

  // our own ute to not overwrite our internal stack, 
  awaitStackSpace = () => {
    return new Promise<void>((resolve, reject) => {
      let startTime = Time.getTimeStamp()
      let timeoutLength = 5000
      let check = () => {
        if (this.stack.length < this.stackMaxLength) {
          resolve();
        } else {
          if (Time.getTimeStamp() - startTime > timeoutLength) {
            reject(`runtime's awaitStackSpace times out after ${timeoutLength} ms`)
          } else {
            setTimeout(check, 0);
          }
        }
      }
      check();
    })
  }

}