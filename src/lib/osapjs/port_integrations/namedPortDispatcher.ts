// thing that manages ambiguous .send() calls

import Runtime from "../runtime";
import Port from "../structure/ports";
import Route from "../packets/routes";
import DeviceNameManager from "./deviceNameManager";
import { NamedPortKeys, NamedPortNameManager } from "./namedPortNameManager";

import SequentialIDResolver from "../utils/sequentialIDResolver";
import Time from "../utils/time";

import { PortTypeKeys } from "../utils/keys";
import { Map } from "../discovery/netRunner";

export default class NamedPortDispatcher {

  // we have a local port that we use to wrip messages out of 
  private port: Port;

  // and we use this id-based message resolver to demux replies 
  private resolver = new SequentialIDResolver();

  // ... and we use these two to collect name info:
  private deviceNameManager: DeviceNameManager;
  private portNameManager: NamedPortNameManager;

  constructor(runtime: Runtime) {
    this.deviceNameManager = new DeviceNameManager(runtime);
    this.portNameManager = new NamedPortNameManager(runtime);
    // 
    this.port = runtime.port();
    // a deeper buffer 
    this.port.setMaxStackLength(16);
    this.port.typeKey = PortTypeKeys.Dispatcher;
    // and instrument the onData here to catch replies 
    this.port.onData((data) => { // func additionally provides sourceRoute and sourcePort, we ignore 
      // each msg demuxes based on a simple ID 
      this.resolver.find(data, 1);
    })
  }

  // pass-through, idk
  rename = async (route: Route, newUniqueName: string) => {
    try {
      // we aught to check (against the map) that thing has a name-port, 
      let rt = this.map.runtimes.find(cand => Route.equality(cand.route, route));
      if(!rt) throw new Error(`during a rename-request, no runtime is found at the provided route`);
      // likewise, find the deviceNames port there,
      let index = rt.ports.findIndex(cand => cand.typeName == 'DeviceNames');
      if(index < 0) throw new Error(`during a rename-request, no 'DeviceNames' port was found in the runtime`);
      // ok, we can finally 
      await this.deviceNameManager.setUniqueName(route, index, newUniqueName);
      // assuming that passed, we can modify the map ! 
      rt.uniqueName = newUniqueName;
      // we're done ! 
    } catch (err) {
      throw err 
    }
  }

  // we keep a map... it's a graph... with names... 
  map: Map = {
    runtimes: [],
    links: [],
  };

  // take an incomplete map, add device and port names (where possible) 
  private fillMapIsRunning = false;
  fillMapNames = async (map: Map): Promise<Map> => {
    try {
      // don't overlap calls 
      if (this.fillMapIsRunning) throw new Error(`overlapped-calling of osap.fillMapNames()...`);
      this.fillMapIsRunning = true;
      // carry on 
      let fillStartTime = Time.getTimeStamp();
      // let's get device names in each runtime: 
      for (let rt = 0; rt < map.runtimes.length; rt++) {
        // is there a deviceName thing here ? 
        let deviceNamePort = map.runtimes[rt].ports.findIndex(cand => cand.typeName == 'DeviceNames');
        if (deviceNamePort != -1) {
          let names = await this.deviceNameManager.getNames(map.runtimes[rt].route, deviceNamePort);
          map.runtimes[rt].typeName = names.typeName;
          map.runtimes[rt].uniqueName = names.uniqueName;
        }
        // and... for each fancyport, grab the name:
        for (let p = 0; p < map.runtimes[rt].ports.length; p++) {
          if (map.runtimes[rt].ports[p].typeName == 'Named') {
            let name = await this.portNameManager.getName(map.runtimes[rt].route, p);
            map.runtimes[rt].ports[p].name = name;
          }
        }
        // we're done ! 
      }
      // how long ?
      console.warn(`name-fill completes after ${(Time.getTimeStamp() - fillStartTime).toFixed(0)}ms`)
      // this is ours now:
      this.map = map;
      // and we return the same, which anyways was just modified... 
      return map;
    } catch (err) {
      throw err
    } finally {
      // we're done, 
      this.fillMapIsRunning = false;
    }
  }

  send = (device: string, port: string, data: Uint8Array) => {
    return new Promise(async (resolve, reject) => {
      try {
        // 1st op is to check that the device is in the map... 
        let deviceMatch = this.map.runtimes.find(cand => cand.uniqueName == device);
        if (deviceMatch == undefined) {
          reject(`couldn't find any runtimes with the name "${device}" in this map`);
          return;
        }
        // 2nd op would be to find a port w/ the given name within that runtime...
        let portMatch = deviceMatch.ports.findIndex(cand => cand.name == port);
        if (portMatch == -1) {
          reject(`couldn't find any ports with the name "${port}" in this "${device}" ...`);
          return;
        }
        // then we can sendy-sendy,
        // we are... also using the fancy-port code here, 
        // so we should write-up a message w/ that in mind 
        let dg = new Uint8Array(data.length + 2);
        // stuff the key & a randy-id in there, 
        dg[0] = NamedPortKeys.MSG;
        dg[1] = this.resolver.writeNew();
        // and stuff the actual-data, trailing the key and randy-id, 
        dg.set(data, 2);
        // now we can do the shipment,
        await this.port.awaitCTS()
        this.port.send(dg, deviceMatch.route, portMatch);
        // and setup to get a response:
        let res = await this.resolver.request(dg[1], `.send to dev: '${device}', port: '${port}'`)
        // res comes back w/ first-five (key, id) intact, so we should shed 'em 
        // that'd be it then, innit ? 
        // we can use ".subarray()" here, which simply offsets the underlying buffer, 
        // or we can use '.slice()", which makes a new underlying buffer: probably more-sane
        // for users to have a freshy, w/o some hidden shit underneath, despite the small perf nerf 
        // of the additional malloc, w/e 
        resolve(res.slice(2));
      } catch (err) {
        reject(err);
      }
    })
  }
}