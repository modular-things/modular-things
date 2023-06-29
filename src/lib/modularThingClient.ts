import { osap } from "../lib/osapjs/osap"
import { COBSWebSerial, COBSWebSerialLink } from "./COBSWebSerial/COBSWebSerial";

import rgbb from "./virtualThings/rgbb";
import capacitive from "./virtualThings/capacitive";
import timeOfFlight from "./virtualThings/timeOfFlight";
import mosfet from "./virtualThings/mosfet";
import accelerometer from "./virtualThings/accelerometer";
import oled from "./virtualThings/oled";
import potentiometer from "./virtualThings/potentiometer";
import servo from "./virtualThings/servo";
import stepper from "./virtualThings/stepper-notSequential";
import maxlStepper from "./virtualThings/maxl/maxl-stepper";

import { global_state } from "./global_state";
import { LGatewayTypeKeys } from "./osapjs/utils/keys";
import { setThingsState } from "./setThingsState";

const constructors = {
  rgbb,
  stepper,
  capacitive,
  timeOfFlight,
  mosfet,
  oled,
  accelerometer,
  potentiometer,
  servo,
  maxlStepper
};

// TODO: cleanup, rm this... 
export type Thing = {
  vPortName: string,
  firmwareName: string,
  vThing: any,
};

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

export async function initSerial(){
  return await webSerialHelper.init();
}

export async function rescan(){
  await webSerialHelper.rescan();
  triggerMapUpdate();
  return 
}

export async function authorizePort(){
  return await webSerialHelper.authorizeNewPort();
}

export async function disconnectAll(){
  // wipe 'em all, 
  await webSerialHelper.disconnectAll();
  // and... that should fire the re-scans, eh? 
}

// central to this is that we diff states... 
// old-maps-of-stuff, and new ones... 
let mapIsAlreadyUpdating = false;
let mapShouldRescan = false;
// 
let triggerMapUpdate = async () => {
  // we don't want to overlap scans, 
  // but if we missed a trigger... and since scan starts 
  // from the root, if we've just added a link up here, 
  // we actually should re-scan once it's finished... 
  if(mapIsAlreadyUpdating){
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
    if(mapShouldRescan){
      // this means that we've updated something locally mid-scan, 
      // so we actually should redux before we execute on the delta, 
      mapIsAlreadyUpdating = false;
      mapShouldRescan = false;
      triggerMapUpdate();
    } else {
      // we have a map ! 

      // (1) let's catch and rename any doubled unique-names 
      // we'll make a set of the unique-names, 
      let nameSet = new Set<string>();
      for(let rt of newMap.runtimes){
        // check if we already-have, 
        if(nameSet.has(rt.uniqueName) && rt.uniqueName != ''){
          // trouble, give it a new random name:
          // osap.rename() is going *also* to modify that map... 
          // TBD if that's the sensible behaviour... 
          console.log(`a double here: ${rt.uniqueName}`)
          let newName = makeID(5);
          await osap.rename(rt.route, makeID(5));
          console.log(`renamed!`)
        }
        // add it then, 
        nameSet.add(rt.uniqueName);
      } // end rename-cycle, 

      // (2) check against existing-things... if no-thing, friggen, make one 
      for(let rt of newMap.runtimes){
        // ignore these 
        if(rt.uniqueName == '') continue;
        // check if we have one... 
        if(global_state.things.value[rt.uniqueName]){
          // it exists 
          console.log(`... looks as though ${rt.uniqueName} exists already...`)
        } else {
          if(constructors[rt.typeName]){
            console.log(`building a new "${rt.typeName}" thing...`)
            // constructor-it, 
            let thing = constructors[rt.typeName](rt.uniqueName);
            // add the typeName,
            thing.typeName = rt.typeName;
            console.log(`built that, it is this:`, thing)
            // it works, huzzah ! 
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
      for(let t in global_state.things.value){
        let thing = global_state.things.value[t];
        // nice to have the key, since...
        if(newMap.runtimes.findIndex(cand => cand.uniqueName == t) == -1){
          console.warn(`looks like you deleted ${t}...`)
          let things = global_state.things.value;
          delete things[t];
          setThingsState(things);
        }
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
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
