// implements a point-to-point network link 
import Runtime from "../runtime";
import Packet from "../packets/packets";

import { TransportKeys, LGatewayTypeKeys } from "../utils/keys";
import Serializers from "../utils/serializers";

export default class LGateway {
  // we aught to know who we are & from whence we came 
  private runtime: Runtime;
  private index: number;
  // we have a stash of incoming msgs, 
  stack: Packet[] = [];
  // we have some core functions, 
  clearToSend: (() => boolean);
  send: ((data: Uint8Array) => void);
  isOpen: (() => boolean);
  // this prop
  typeKey: number = LGatewayTypeKeys.Unknown;
  // constructor collects all callbacks, 
  constructor(
    runtime: Runtime, index: number,
    implementation: {
      clearToSend: (() => boolean), 
      send: ((data: Uint8Array) => void), 
      isOpen: (() => boolean),
      typeKey: number,
    },
  ) {
    // just stashing each... 
    this.runtime = runtime;
    this.index = index;
    this.clearToSend = implementation.clearToSend;
    this.send = implementation.send;
    this.isOpen = implementation.isOpen;
    this.typeKey = implementation.typeKey;
  };

  // implementer calls this...
  ingestPacket = (pck: Uint8Array): void => {
    // yeah, couple of things to do:
    // (1) check that the packet is at least roughly as expected:
    if (pck[pck[0]] != TransportKeys.LINKF) { throw new Error(`rx'd a poorly formed packet at this link, tossing it !`); }
    // (2) insert our own index, for the reversal, 
    Serializers.writeUint16(pck, pck[0] + 1, this.index);
    // (3) increment the pointer along 
    pck[0] += TransportKeys.getIncrement(TransportKeys.LINKF);
    // (4) insert the paquiat to the staquiat
    this.stack.push(Packet.external(this, pck));
    // I'm curious about the need for flowcontrol here, 
    // at the moment there's none, let's just do this for now:
    if (this.stack.length > 8) {
      console.warn(`WARNING: this link's stackLength is > 8, we should implement flowcontrol...`);
    }
    // but carry on... 
    this.runtime.requestLoopCycle();
  }

  // ------------------------ Runtime API 
  getPacketsToService = (): Packet[] => {
    return this.stack;
  }
}