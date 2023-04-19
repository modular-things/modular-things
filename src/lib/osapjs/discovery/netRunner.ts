// graph info-getter 

import Runtime from "../runtime"
import NetRunnerAtomics from "./netRunnerAtomics";
import { RuntimeInfo, PortInfo, LGatewayInfo } from "./netRunnerAtomics";
import Route from "../packets/routes"
import Time from "../utils/time";
import { TransportKeys } from "../utils/keys";
import Serializers from "../utils/serializers";
import RandomIDGen from "../utils/randomIDGen";

export type MapLink = number[][];

export type MapRuntime = {
  typeName: string,
  uniqueName: string,
  route: Route,
  build: string,
  version: string,
  ports: PortInfo[],
  lgateways: LGatewayInfo[]
}

export type Map = {
  runtimes: MapRuntime[];
  links: MapLink[];
}

export default class NetRunner {

  atomics: NetRunnerAtomics;

  constructor(runtime: Runtime) {
    this.atomics = new NetRunnerAtomics(runtime);
  }

  private mapDiscoveryIsRunning = false;
  getSystemMap = async (): Promise<Map> => {
    // don't overlap calls
    if (this.mapDiscoveryIsRunning) throw new Error(`overlapped-calling of osap.getSystemMap()...`);
    this.mapDiscoveryIsRunning = true;
    // track beginnings... 
    let sweepStartTime = Time.getTimeStamp();
    let traverseID = RandomIDGen.getNew();
    // 
    try {
      // we're making some lists... 
      let runtimes: MapRuntime[] = [];
      // an intermediary type for our links, 
      let tempLinks: {
        sourceRoute: Route,
        sourceIndex: number,
        destRoute: Route,
        destIndex: number
      }[] = [];
      // yonder recursor, starts w/ one runtime-info object which is ~ the level of the 
      // current search... 
      let recursor = async (rtInfo: RuntimeInfo) => {
        try {
          console.warn(`RTINFO: `, JSON.parse(JSON.stringify(rtInfo)));
          // we'll build this object as a "runtime" thing, 
          // and stash it in our array of those... 
          let rtMirror = {
            route: rtInfo.route,
            build: rtInfo.build,
            version: rtInfo.version,
            ports: await this.atomics.getPortInfo(rtInfo.route, 0, rtInfo.portCount),
            lgateways: await this.atomics.getLGatewayInfo(rtInfo.route, 0, rtInfo.linkGatewayCount),
            bgateways: [],
            typeName: '',
            uniqueName: '',
          };
          runtimes.push(rtMirror);
          // now we want to recurse down any availabe link-gateways:
          for (let l = 0; l < rtMirror.lgateways.length; l++) {
            console.warn(`link ${l} from ${rtMirror.build}... id ${traverseID[0]}`)
            if (rtMirror.lgateways[l].isOpen) {
              // if this is open, we can build a new route to search down, 
              console.warn(`traversen across link ${l} from ${rtMirror.build}... id ${traverseID[0]}`, rtMirror.lgateways[l])
              let searchRoute = Route.build(rtMirror.route).link(l).end()
              console.warn(`ROUTE: `, searchRoute);
              // and get info on whatever lays across it... 
              let nextRtInfo = await this.atomics.getRuntimeInfo(searchRoute, traverseID)
              // check if we have scanned this mf' before, don't chase tails: 
              // this also works to avoid graph-loop-chail-tasing 
              if (RandomIDGen.checkMatch(nextRtInfo.previousTraverseID, traverseID)) {
                console.warn(`not re-upping here...`);
                continue;
              }
              // so we have a candidate new device here, we know already where the link's 
              // source is (i.e. the lgateway that we tx'd from), we also need to know 
              // which port the device rx'd our message on, that's encoded in this 
              // .entryInstruction object from the .getRuntimeInfo() rpc,
              if (nextRtInfo.entryInstruction[0] !== TransportKeys.LINKF) {
                console.log(nextRtInfo.route, nextRtInfo.entryInstruction)
                throw new Error(`entry via link, but entry-instruction not reporting linkf...`);
              } else {
                // we can read the lgateway index out of this instruction... 
                let entryIndex = Serializers.readUint16(nextRtInfo.entryInstruction, 1)
                // and we can build a link object with that... 
                // noting that we use routes as a kind of id temporarily, 
                // since we don't know the final place of each runtime in our array 
                // at this time (we're adding to it asynchronously...)
                tempLinks.push({
                  sourceRoute: rtInfo.route,
                  sourceIndex: l,
                  destRoute: nextRtInfo.route,
                  destIndex: entryIndex
                });
                // since we're confident about how we got there, we can also recurse down this 
                // in one more step, to find even more tiny-friends... 
                await recursor(nextRtInfo);
              }
            }
          } // end for-l-in-lgateways 
          // and would do... a connection step ? 
        } catch (err) {
          throw err
        }
      } // end recursor definition 
      // we'll kick it off w/ our own:
      let ownRuntimeInfo = await this.atomics.getRuntimeInfo(Route.build().end(), traverseID)
      // return ownRuntimeInfo
      await recursor(ownRuntimeInfo)
      // 
      console.warn(`recursor cycle completed... fixing link indices...`)
      // now we have runtimes, links, busses, but we want to re-formulate links so that 
      // their 1st index is w/r/t the runtimes[] array, not w/r/t the route-to-the-runtime, so we can do:
      let links: MapLink[] = [];
      for (let l = 0; l < tempLinks.length; l++) {
        // find head, tails as indices... 
        let sourceRuntimeIndex = runtimes.findIndex((cand) => {
          return cand.route == tempLinks[l].sourceRoute;
        })
        let destRuntimeIndex = runtimes.findIndex((cand) => {
          return cand.route == tempLinks[l].destRoute;
        })
        // check how that went... 
        if (sourceRuntimeIndex == -1 || destRuntimeIndex == -1) {
          throw new Error(`failed to find runtime-indices for link hookup after a graph search (?) ${sourceRuntimeIndex} ... ${destRuntimeIndex}`)
        }
        // if it's all good, swap in link info... 
        links.push([
          [sourceRuntimeIndex, tempLinks[l].sourceIndex],
          [destRuntimeIndex, tempLinks[l].destIndex]
        ])
      }
      // now check... and we should rebuild w/ indices (not routes) 
      console.warn(`sweep comletes after ${(Time.getTimeStamp() - sweepStartTime).toFixed(0)}ms`)
      // ok 
      return {
        runtimes,
        links,
      }
    } catch (err) {
      console.error(`getSystemGraph sweep fails after ${(Time.getTimeStamp() - sweepStartTime).toFixed(0)}ms`)
      throw err
    } finally {
      // we're done, 
      this.mapDiscoveryIsRunning = false;
    }
  }
}