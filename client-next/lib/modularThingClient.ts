/*
modularThingClient.js

modular-things client

Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

// core elements
import OSAP from "./osapjs/core/osap.js";

import rgbb from "./virtualThings/rgbb.js";
import stepper from "./virtualThings/stepper.js";
import capacitive from "./virtualThings/capacitive.js";
import timeOfFlight from "./virtualThings/timeOfFlight.js";
import mosfet from "./virtualThings/mosfet.js";
import accelerometer from "./virtualThings/accelerometer.js";
import oled from "./virtualThings/oled.js";
import potentiometer from "./virtualThings/potentiometer.js";
import servo from "./virtualThings/servo.js";
import VPortWebSerial from "./osapjs/vport/vPortWebSerial";
import { getStore, patchStore } from "./state";

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

const portThingMap = new Map<SerialPort, string>();

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
    vThing
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

  portThingMap.set(port, thingName);

  return [thingName, thing];
}

export async function rescan() {
  const ports = await navigator.serial.getPorts();
  const { things } = getStore();
  for(const port of ports.filter(p => !portThingMap.has(p))) {
    const [name, thing] = await setupPort(port);
    things[name] = thing;
  }
  patchStore(["things"]);
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
    const store = getStore();
    const [name, thing] = await setupPort(event.target as SerialPort);
    store.things[name] = thing;
    patchStore(["things"]);
  });

  navigator.serial.addEventListener('disconnect', async (event) => {
    console.log("disconnect!");
    const store = getStore();
    const name = portThingMap.get(event.target as SerialPort);
    if(name) {
      delete store.things[name];
      patchStore(["things"]);
    }
  });
}

export async function authorizePort() {
  return await setupPort(await navigator.serial.requestPort());
}

const characters       = 'abcdefghijklmnopqrstuvwxyz';
const charactersLength = characters.length;
function makeID(length: number) {
    let result = '';
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
