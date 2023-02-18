import OSAP from "./osapjs/core/osap";
import { TS } from './osapjs/core/ts.js';

import rgbb from "./virtualThings/rgbb";
import stepper from "./virtualThings/stepper";
import capacitive from "./virtualThings/capacitive";
import timeOfFlight from "./virtualThings/timeOfFlight";
import mosfet from "./virtualThings/mosfet";
import accelerometer from "./virtualThings/accelerometer";
import oled from "./virtualThings/oled";
import potentiometer from "./virtualThings/potentiometer";
import servo from "./virtualThings/servo";

import VPortWebSerial from "./osapjs/vport/vPortWebSerial";

import { global_state } from "./global_state";

const osap = new OSAP("modular-things")

const constructors = {
  rgbb,
  stepper,
  capacitive,
  timeOfFlight,
  mosfet,
  oled,
  accelerometer,
  potentiometer,
  servo
};

export type Thing = {
  vPortName: string,
  firmwareName: string,
  vThing: any,
};

// const portThingMap = new Map<SerialPort, string>();

async function setupPort(port: SerialPort): Promise<[string, Thing]> {
  const vPort = await VPortWebSerial(osap, port, false);
  const graph = await osap.nr.sweep();
  let ch = graph.children.find((ch: any) => ch.name === "vp_" + vPort.portName);
  if(!ch) throw new Error("Connected serial port but could not find OSAP vertex for it");
  if(!ch.reciprocal) throw new Error("Connected serial port but OSAP vertex doesn't have a reciprocal");
  if(ch.reciprocal.type == "unreachable") throw new Error("Connected serial port but OSAP vertex's partner is unreachable");

  // we have some name like `rt_firmwareName` that might have `_uniqueName` trailing
  // so first we can grab the firmwareName like:
  let vt = ch.reciprocal.parent 
  let [ _rt, firmwareName, uniqueName ] = (vt.name as string).split("_");

  let madeNewUniqueName = false;
  if (!uniqueName) {
    // if we don't have a given unique name, make a new one:
    uniqueName = makeID(5);
    madeNewUniqueName = true
  }

  console.log(`found a... "${firmwareName}" with unique name ${uniqueName} module via usb "${ch.name}"`)
  // TODO: unique-name write to flashmem
  // jake things unique-names should be more human-typeable,
  // we also aught to check if the name is unique already, then not-change-it if it is,
  let thingName = uniqueName;

  let vThing

  if(!(firmwareName in constructors)){
    // this is the unknown device...
    console.log(vt)
    // get each fn that is an RPC in this device, 
    let rpcs = vt.children.filter((ch: any) => ch.name.includes("rpc_"))
    console.log(`found rpcs`, rpcs)
    // get their infos, 
    rpcs = await Promise.all(rpcs.map((vvt) => { 
      return osap.mvc.getRPCInfo(vvt) 
    }))
    console.log(`info'd rpcs`, rpcs)
    // get them funcs 
    let funcs = rpcs.map(info => osap.rpc.rollup(info))
    console.log(`func'd rpcs`, funcs)
    // let's build an object from it ? 
    let obj = {
      firmwareName,
      setup: () => {},
      vt: vt, 
      api: []
    }
    // and assign functions, 
    for(let f in rpcs){
      obj[rpcs[f].name] = funcs[f]
      // array args or else... 
      let args, ret 
      if(rpcs[f].argLen > 1){
        args = [`${rpcs[f].argName}: Array(${rpcs[f].argLen}) [${TS.keyToString(rpcs[f].argKey)}]`]
      } else {
        args = [`${rpcs[f].argName}: ${TS.keyToString(rpcs[f].argKey)}`]
      }
      if(rpcs[f].retLen > 1){
        ret = [`Array(${rpcs[f].retLen}) ${TS.keyToString(rpcs[f].retKey)}`] 
      } else {
         ret =  [`${TS.keyToString(rpcs[f].retKey)}`] 
      }
      obj.api.push({
        name: rpcs[f].name,
        // other args do "argName: type (opt: range)"
        // return values are just values, 
        // should convert these to types... and name 'em 
        args: args,
        return: ret 
      })
    }
    console.log(obj)
    vThing = obj 
    console.warn(`dropping unknown thing in...`)
    // we don't have a match, let's try to find some RPC info... 
    // throw new Error(`no constructor found for the ${firmwareName} thing...`);
  } else {
    vThing = constructors[firmwareName](
      osap, vt, thingName
    );
    vThing.firmwareName = firmwareName;  
  }

  //@ts-expect-error
  const thing = {
    vPortName: ch.name,
    firmwareName,
    vThing,
    close: () => {
      vPort.close();
    },
    port
  }

  vThing["setName"] = async (name: string) => {
    try {
      // add back that "rt_" which designates the vertex as a root... 
      const newName = `rt_${thing.vThing.firmwareName}_${name}`;
      console.log(newName);
      await osap.mvc.renameVertex(thing.vThing.vt.route, newName)
    } catch (err) {
      console.error(err)
    }
  };

  console.log("add", thingName, thing);
  await thing.vThing.setup();
  // finally, rename it to
  if (madeNewUniqueName) {
    await thing.vThing.setName(thingName);
  }

  // portThingMap.set(port, thingName);

  return [thingName, thing];
}

export async function rescan() {
  const ports = await navigator.serial.getPorts();
  const things = global_state.things.value;
  const usedPorts = Object.values(things).map(x => x.port);
  for(const port of ports) {
    if (usedPorts.includes(port)) continue;
    const [name, thing] = await setupPort(port);
    things[name] = thing;
  }

  // set things state
  global_state.things.value = {};
  global_state.things.value = things;
}

// React StrictMode renders components twice on dev to detect problems
// but this can only be run one time
// so have this check to ensure that
let serialInitted = false;
export async function initSerial() {
  if(serialInitted) return;
  serialInitted = true;

  rescan();

  navigator.serial.addEventListener('connect', async (event) => {
    console.log("connect!");
    const [ name, thing ] = await setupPort(event.target as SerialPort);
    const things = global_state.things.value;
    things[name] = thing;
    
    // set things state
    global_state.things.value = {};
    global_state.things.value = things;
  });

  navigator.serial.addEventListener('disconnect', async (event) => {
    console.log("disconnect!");
    const things = global_state.things.value;

    const port = event.target;

    const portThingMap = Object.entries(things).reduce((acc, cur) => {
      const [ key, value ] = cur;
      acc.set(value.port, key);
      return acc;
    }, new Map());

    const name = portThingMap.get(event.target);
    if (name) {
      things[name].close();
      delete things[name];
      
      // set things state
      global_state.things.value = {};
      global_state.things.value = things;
    }
  });
}

export async function authorizePort() {
  return await setupPort(await navigator.serial.requestPort());
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
