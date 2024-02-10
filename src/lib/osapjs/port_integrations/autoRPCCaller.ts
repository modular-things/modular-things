// osapjs/port_integrations/autoRPCCaller.ts
// talks to an rpc implementer port, collects function info and 
// implements that function in js 

// TODO: we can basically delete this and just write "real-world skeletons" 
// using the same function signature... that call them functos directly 
// then users can edit those as they wish / re-encapsulate, etc, 
// and "modular things" just becomes a front for that skeletonization, 
// and a library imported *by those skeletons* ... 
// more cool shit: skeletons could be defined in various levels: js, ts, and 
// "tight" - no type checking, faster, and "safe" - type-checked, etc 
// or / also... could spin out async and blocking codes 

import Runtime from "../runtime";
import Port from "../structure/ports";
import Route from "../packets/routes";
import { PortTypeKeys, keyToString } from "../utils/keys";

import SequentialIDResolver from "../utils/sequentialIDResolver";
import serdes from "../utils/newSerializers";

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
  private implementerRoute: Route;
  private implementerPort: number;

  private sig: any = null;

  // see, writing the skeleton is easy ! 
  private signatureMismatchError = () => {
    throw new Error("your .call on this RPC failed, please check your code against the signature:\n'" 
      + `${this.sig.functionName} = async (` 
      + `${this.sig.args.map((arg, i) => `${arg.name}: ${this.sig.args[i].type}`).join(`, `)}): `
      + `${this.sig.returnType}{}'`)
  }

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
    // so, res unpacks: 0 is the key, 1 is the id, then 
    let rptr = 2
    let returnType = keyToString(res[rptr++], serdes.keys);
    let argCount = res[rptr++];
    let args = Array.from({ length: argCount }, () => ({
      type: keyToString(res[rptr ++], serdes.keys),
      name: ''  
    }));
    // ... arg typekeys were next, then
    let functionName = serdes.read.string(res, rptr) // string 
    rptr += functionName.length + 2;
    // ... arg names 
    for (let a = 0; a < argCount; a++) {
      console.log(a, rptr);
      args[a].name = serdes.read.string(res, rptr);
      rptr += args[a].name.length + 2;
    }
    // so we have this object now, which I suppose we should rollup 
    // as a "function" type or sth, for now let's just stash it: 
    this.sig = {
      functionName,
      returnType,
      args
    };
  }

  // get info... 
  getName = () => {
    return this.sig.functionName;
  }

  getReturnType = () => {
    return this.sig.returnType;
  }

  getArgs = () => {
    return this.sig.args;
  }

  // get a ref to 'call'
  getCallPointer = () => {
    return this.call; 
  }

  // to call the function, we can use ...arg packs 
  call = async (... args: any) => {
    if(this.sig == null) throw new Error("attempt to .call the RPC before .setup() is complete");

    // check args against our signature, 
    if(args.length != this.sig.args.length) return this.signatureMismatchError();
    // check args one-by-one ? 
    for(let a = 0; a < args.length; a ++){
      let sigArgType = this.sig.args[a].type
      // we are not going to support objects, symbols, and other bullshit yet 
      switch (typeof args[a]){
        case "boolean":
          if(sigArgType != "bool") return this.signatureMismatchError();
          break;
        case "number":
          if(sigArgType != "int" && sigArgType != "float32") return this.signatureMismatchError();
          break;
        case "string":
          if(sigArgType != "string") return this.signatureMismatchError();
          break;
        default:
          return this.signatureMismatchError();
          break;
      }
    }

    // args passed all checks, let's serialize this badboy, ship it, genny the result, and return that 
    // means it's packet writing time, 
    let funcCallDG = new Uint8Array(256);
    funcCallDG[0] = AutoRPCKeys.FunctionCall;
    funcCallDG[1] = this.resolver.writeNew();
    // ... it's literally just the args, all in a row... 
    let wptr = 2;
    for(let a = 0; a < args.length; a ++){
      // it's js metaprogramming, babey 
      wptr += serdes.write[`${this.sig.args[a].type}`](args[a], funcCallDG, wptr);
    }

    // ship it and await res, yeh ?
    this.port.send(funcCallDG.subarray(0, wptr), this.implementerRoute, this.implementerPort);
    let res = await this.resolver.request(funcCallDG[1], 'function call');

    // then we would un-bottle that, 
    // console.log(funcCallDG.subarray(0, wptr));
    // console.log(`sent dg to implementer, rx'd this res`, res);

    // check if it's gucci ? 
    // res[0] is the key, res[1] the id, then the data straight up:
    let result = serdes.read[`${this.sig.returnType}`](res, 2);
    // console.log(`deser is`, result)
    return result; 
  }


}