import OSAP from "./osapjs/core/osap";

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
  let [ _rt, firmwareName, uniqueName ] = (ch.reciprocal.parent.name as string).split("_");

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

  if(!(firmwareName in constructors)) throw new Error(`no constructor found for the ${firmwareName} thing...`);
  //@ts-expect-error
  const vThing = constructors[firmwareName](
    osap, ch.reciprocal.parent, thingName
  );
  vThing.firmwareName = firmwareName;

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
