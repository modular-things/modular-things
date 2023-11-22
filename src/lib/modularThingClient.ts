import { osap } from "../lib/osapjs/osap"
import { COBSWebSerial, COBSWebSerialLink } from "./COBSWebSerial/COBSWebSerial";

import { global_state } from "./global_state";
import { LGatewayTypeKeys } from "./osapjs/utils/keys";
import { setThingsState } from "./setThingsState";

// bring in the things, 
import constructors from "../../things/index"

// TODO: cleanup, rm this... 
export type Thing = {
  vPortName: string,
  firmwareName: string,
  vThing: any,
};

// instantiates links to new devices 
let webSerialHelper = new COBSWebSerial();
webSerialHelper.onNewLink = async (link: COBSWebSerialLink) => {
  try {
    console.warn(`COBSerial hooked a new port! lettuce osap-it!`, link)
    // so, yeah, make a new link: 
    let osapLink = osap.linkGateway({
      isOpen: link.isOpen,
      clearToSend: link.clearToSend,
      send: link.send,
      typeKey: LGatewayTypeKeys.USBSerial,
    })
    // and plumb the response, 
    link.onData = osapLink.ingestPacket;
    // and we have this to do the dissolution,
    // TODO: maybe some cases where we need to ~ basically debounce this... 
    link.onClose = async () => {
      // dissolve the link, osap-wise, 
      osapLink.dissolve();
      // and let's get an update in this case, 
      triggerMapUpdate();
    }
    // uuuh 
    triggerMapUpdate();
  } catch (err) {
    console.error(err)
  }
}

export async function initSerial() {
  return await webSerialHelper.init();
}

export async function rescan() {
  await webSerialHelper.rescan();
  triggerMapUpdate();
  return
}

export async function authorizePort() {
  return await webSerialHelper.authorizeNewPort();
}

export async function disconnectAll() {
  // wipe 'em all, 
  await webSerialHelper.disconnectAll();
  // and... that should fire the re-scans, eh? 
}

// central to this is that we diff states... 
// old-maps-of-stuff, and new ones... 
let mapIsAlreadyUpdating = false;
let mapShouldRescan = false;

let triggerMapUpdate = async () => {
  // we don't want to overlap scans, 
  // but if we missed a trigger... and since scan starts 
  // from the root, if we've just added a link up here, 
  // we actually should re-scan once it's finished... 
  if (mapIsAlreadyUpdating) {
    mapShouldRescan = true;
    return;
  }
  // ok, finally... 
  try {
    mapIsAlreadyUpdating = true;
    // do it, then 
    let newMap = await osap.updateMap();
    console.log(`yu've got a new map, lad`, newMap)
    // uuuhh...
    if (mapShouldRescan) {
      // this means that we've updated something locally mid-scan, 
      // so we actually should redux before we execute on the delta, 
      mapIsAlreadyUpdating = false;
      mapShouldRescan = false;
      triggerMapUpdate();
      return;
    }
    // we have a map ! 
    // (1) let's catch and rename any doubled unique-names 
    // we'll make a set of the unique-names, 
    let nameSet = new Set<string>();
    for (let rt of newMap.runtimes) {
      // check if we already-have, 
      if (nameSet.has(rt.uniqueName) && rt.uniqueName != '') {
        // trouble, give it a new random name:
        // osap.rename() is going *also* to modify that map... 
        // TBD if that's the sensible behaviour... 
        console.log(`a double here: ${rt.uniqueName}`)
        await osap.rename(rt.route, makeID(5));
        console.log(`renamed!`)
      }
      // add it then, 
      nameSet.add(rt.uniqueName);
    } // end rename-cycle, 

    // (2) check against existing-things... if no-thing, friggen, make one 
    for (let rt of newMap.runtimes) {
      // ignore these 
      if (rt.uniqueName == '') continue;
      // check if we have one... 
      if (global_state.things.value[rt.uniqueName]) {
        // it exists 
        console.log(`... looks as though ${rt.uniqueName} exists already...`)
      } else {
        if (constructors[rt.typeName]) {
          console.log(`building a new "${rt.typeName}" thing...`)
          // do pipes 
          let pipes = []
          for (let p in rt.ports) {
            let port = rt.ports[p]
            // build escape routes 
            if (port.typeName == "MessageEscape") {
              // make a new listener and subscribe via... 
              let listener = osap.messageEscapeListener()
              await listener.begin(rt.route, parseInt(p), rt.uniqueName);
              console.warn(`built an error-escape pipe for`, port, p);
            }
            // build pipes 
            // ... error pipe is just a special case of string-encoded pipe 
            // cleanup would... do better to spec this in the hilevel api-thing, 
            // i.e. at setup do
            // for(let pipe of pipes){ if pipe.name == "errors" ... } etc ? 
            if (port.typeName == "OnePipe") {
              let listener = osap.onePipeListener()
              await listener.begin(rt.route, parseInt(p), rt.uniqueName);
              pipes.push(listener);
              console.warn(`build up-pipe for`, port, p);
            }
          } // end check-for-up-pipes       
          // constructor-it, 
          let thing = new constructors[rt.typeName](rt.uniqueName, pipes);
          // add the typeName,
          thing.typeName = rt.typeName;
          console.log(`built that, it is this:`, thing)
          // now we want to push that into global state, just... the thing itself, 
          // IDK what this all is ... but it looks like we should do:
          // pull this from globals, 
          let things = global_state.things.value;
          // add to it, 
          things[rt.uniqueName] = thing;
          // and update with this
          setThingsState(things);
          console.log(`did setThingsState...`)
          // direct-write would be this:           
          // global_state.things.value[rt.uniqueName] = thing;
          // that should be it, whatever else happens after ".things.value" is updated ? 
          // console.log(thing)
          // let res = await thing.setRGB(0.0, 0.0, 0.25);
        } else {
          console.warn(`couldn't find a constructor for a "${rt.typeName}" thing...`)
        }
      }
    } // end add-step, 

    // (3) check that every "thing" still exists (in the map)
    for (let t in global_state.things.value) {
      let thing = global_state.things.value[t];
      // nice to have the key, since...
      if (newMap.runtimes.findIndex(cand => cand.uniqueName == t) == -1) {
        console.warn(`looks like you deleted ${t}...`)
        let things = global_state.things.value;
        delete things[t];
        setThingsState(things);
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    mapIsAlreadyUpdating = false;
  }
}

const characters = 'abcdefghijklmnopqrstuvwxyz';
const charactersLength = characters.length;
function makeID(length: number) {
  let result = '';
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
