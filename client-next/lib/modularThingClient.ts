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
import PK from "./osapjs/core/packets.js";
import TIME from "./osapjs/core/time.js";

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
import { patchStore } from "./state";

console.log(`------------------------------------------`)
console.log("hello modular-things")

// -------------------------------------------------------- OSAP Object
const osap = new OSAP("modular-things")

// -------------------------------------------------------- SETUP NETWORK / PORT
// const wscVPort = osap.vPort("wscVPort")

// -------------------------------------------------------- Like, Application Code ?

// and endpoint that tells us to rescan;
const rescanEndpoint = osap.endpoint("browserRescan")
//@ts-expect-error
rescanEndpoint.onData = () => {
  console.log('triggered a rescan...')
  rescan()
}

// a list of constructors,
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
  vThing: any
};

// lol, this adds the function "setUniqueName" 
// to the virtual thing, 
async function addSetName(thing: any, osap: OSAP) {
  thing.setName = async (name: string) => {
    try {
      // add back that "rt_" which designates the vertex as a root... 
      const newName = `rt_${thing.firmwareName}_${name}`;
      console.log(newName);
      await osap.mvc.renameVertex(thing.vt.route, newName)
    } catch (err) {
      console.error(err)
    }
  }
} 

// a list of virtual machines,
// let scanning = false;
export const rescan = async (): Promise<Record<string, Thing>> => {
  // if (scanning) return;
  // scanning = true;

  const things: Record<string, Thing> = {};
  let usedPorts: string[] = [];

  let graph = await osap.nr.sweep()
  let usbBridge = await osap.nr.find("rt_local-usb-bridge", graph)

  for (let ch of usbBridge.children) {
    // ignore pipe up to us,
    if (ch.name.includes("wss")) continue
    // peep across usb ports,
    if (ch.reciprocal) {
      if (ch.reciprocal.type == "unreachable") {
        console.warn(`${ch.name}'s partner is unreachable...`)
        continue
      }
      // we have some name like `rt_firmwareName` that might have `_uniqueName` trailing
      // so first we can grab the firmwareName like:
      let [ rt, firmwareName, uniqueName ] = ch.reciprocal.parent.name.split("_");

      let madeNewUniqueName = false;
      if (!uniqueName) {
        // if we don't have a given unique name, make a new one:
        uniqueName = `${makeID(5)}`
        madeNewUniqueName = true
      }

      // log...
      console.log(`found a... "${firmwareName}" with unique name ${uniqueName} module via usb "${ch.name}"`)
      // do we already have this one in our list ? here we diff by port-nums, not names, lol
      if (usedPorts.includes(ch.name)) {
        console.warn(`this "${firmwareName}" is already setup...`)
        continue
      }
      // TODO: unique-name write to flashmem
      // jake things unique-names should be more human-typeable,
      // we also aught to check if the name is unique already, then not-change-it if it is,
      let thingName = `${uniqueName}`;

      // if not, check if we have a matching code for it...
      //@ts-expect-error
      if (constructors[firmwareName]) {
        // we need ~ to guarantee unique names also (!)
        // create it & add to this global list
        usedPorts.push(ch.name);
        //@ts-expect-error
        const vThing = constructors[firmwareName](
          osap, ch.reciprocal.parent, thingName
        );
        vThing.firmwareName = firmwareName;

        let thing = {
          vPortName: ch.name,
          firmwareName,
          vThing
        }

        // add the renaming handle...
        await addSetName(thing.vThing, osap);
        // add to our global ist, then we're done !
        console.log("add", thingName, thing);
        await thing.vThing.setup();
        things[thingName] = thing;
        // finally, rename it to
        if (madeNewUniqueName) {
          await thing.vThing.setName(thingName);
        }
      } else {
        // here is where we could roll up an "auto-object" type, if we can't find one:
        console.error(`no constructor found for the ${firmwareName} thing...`);
        // let type = "stepper";
        // let initialName = "0";
        // let vThing = constructors[type](osap, ch.reciprocal.parent, initialName)
        // vThing.firmwareName = type;
        // await addSetName(vThing, osap)
        // vThing.setName(initialName);
      }
    }
  }

  return things;

  // scanning = false;
}


export const setupPort = async (port: SerialPort): Promise<[string, Thing]> => {
  const vPort = await VPortWebSerial(osap, port, true);
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

  // log...
  console.log(`found a... "${firmwareName}" with unique name ${uniqueName} module via usb "${ch.name}"`)
  // TODO: unique-name write to flashmem
  // jake things unique-names should be more human-typeable,
  // we also aught to check if the name is unique already, then not-change-it if it is,
  let thingName = uniqueName;

  // if not, check if we have a matching code for it...
  if(!(firmwareName in constructors)) throw new Error(`no constructor found for the ${firmwareName} thing...`);
  //@ts-expect-error
  const vThing = constructors[firmwareName](
    osap, ch.reciprocal.parent, thingName
  );
  vThing.firmwareName = firmwareName;

  let thing = {
    vPortName: ch.name,
    firmwareName,
    vThing
  }

  await addSetName(thing.vThing, osap);
  console.log("add", thingName, thing);
  await thing.vThing.setup();
  // finally, rename it to
  if (madeNewUniqueName) {
    await thing.vThing.setName(thingName);
  }

  return [thingName, thing];
}

export async function initSerial() {
  // navigator.serial.addEventListener('connect', async (event) => {

  // });

  const ports = await navigator.serial.getPorts();
  const things: Record<string, Thing> = {};
  for(const port of ports) {
    const [name, thing] = await setupPort(port);
    things[name] = thing;
  }
  patchStore({
    things
  });
}

export async function authorizePort() {
  return await setupPort(await navigator.serial.requestPort());
}

export const rescanNew = async (): Promise<Record<string, Thing>> => {
  const ports = await navigator.serial.getPorts();
  const things: Record<string, Thing> = {};

  for (const port of ports) {
    const vPort = new VPortWebSerial(osap, port, true);
    
  }

}

// setTimeout(rescan, 1000)

/*
things.rgbbThing_0.handlers.onButtonStateChange = (state) => {
  if(state){
    things.rgbbThing_1.methods.setRGB(0.5, 0.5, 0.1)
  } else {
    things.rgbbThing_1.methods.setRGB(0,0,0)
  }
}
*/

// -------------------------------------------------------- Initializing the WSC Port
/*
// verbosity
let LOGPHY = false
// to test these systems, the client (us) will kickstart a new process
// on the server, and try to establish connection to it.
console.log("making client-to-server request to start remote process,")
console.log("and connecting to it w/ new websocket")

let wscVPortStatus = "opening"
// here we attach the "clear to send" function,
// in this case we aren't going to flowcontrol anything, js buffers are infinite
// and also impossible to inspect
//@ts-expect-error
wscVPort.cts = () => { return (wscVPortStatus == "open") }
// we also have isOpen, similarely simple here,
//@ts-expect-error
wscVPort.isOpen = () => { return (wscVPortStatus == "open") }

// ok, let's ask to kick a process on the server,
// in response, we'll get it's IP and Port,
// then we can start a websocket client to connect there,
// automated remote-proc. w/ vPort & wss medium,
// for args, do '/processName.js?args=arg1,arg2'
fetch('http://localhost:8080/startLocal/osapSerialBridge.js').then(async (res) => {
  const text = await res.text();
  if (text.includes('OSAP-wss-addr:')) {
    let addr = text.substring(text.indexOf(':') + 2)
    if (addr.includes('ws://')) {
      wscVPortStatus = "opening"
      // start up,
      console.log('starting socket to remote at', addr)
      let ws = new WebSocket(addr)
      ws.binaryType = "arraybuffer"
      // opens,
      ws.onopen = (evt) => {
        wscVPortStatus = "open"
        // implement rx
        ws.onmessage = (msg) => {
          let uint = new Uint8Array(msg.data)
          wscVPort.receive(uint)
        }
        // implement tx
        //@ts-expect-error
        wscVPort.send = (buffer) => {
          if (LOGPHY) console.log('PHY WSC Send', buffer)
          ws.send(buffer)
        }
      }
      ws.onerror = (err) => {
        wscVPortStatus = "closed"
        console.log('sckt err', err)
      }
      ws.onclose = (evt) => {
        wscVPortStatus = "closed"
        console.log('sckt closed', evt)
      }
    }
  } else {
    console.error('remote OSAP not established', text)
  }
})*/

const characters       = 'abcdefghijklmnopqrstuvwxyz';
const charactersLength = characters.length;
function makeID(length: number) {
    let result = '';
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
