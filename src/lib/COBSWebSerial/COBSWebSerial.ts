import COBS from "./utils/cobs";

export type COBSWebSerialLink = {
  underlyingPort: SerialPort;                             // the underlying port instance 
  isOpen: (() => boolean);                                // as below,  
  clearToSend: (() => boolean);                           // func to check ahead with 
  send: ((data: Uint8Array) => void);                     // func to ship data with 
  onData: ((data: Uint8Array) => void);                   // user-setup data callback  
  onClose: (() => void);                                  // user-setup close callback 
}

type SerialPort = any;

export class COBSWebSerial {

  constructor() { }

  private initialized = false;
  private openLinks: COBSWebSerialLink[] = [];

  // implementers should use this to listen for emergence of new ports... 
  onNewLink = async (port: COBSWebSerialLink) => {
    console.warn(`default onNewPort()...`)
  }

  // make a new port here... 
  setupPort = async (port: SerialPort): Promise<COBSWebSerialLink> => {
    try {
      console.log(`setting up a port... `, port);
      // open it up, 
      await port.open({ baudRate: 9600 });
      console.log(`port open... `);
      // rollup some funcs, 
      let send = async (data: Uint8Array) => {
        // pack is encoded 
        let pck = COBS.encode(data)
        // get a writer, write, and bail, 
        let writer = port.writable!.getWriter();
        await writer.write(pck)
        // console.log(`wrote`, pck)
        writer.releaseLock();
      }
      // for now these are dummies... 
      let clearToSend = () => { return true; }
      let isOpen = () => { return true; }
      // make a new port w/ these things, 
      let link = {
        underlyingPort: port,
        isOpen: isOpen,
        clearToSend: clearToSend,
        send: send,
        onData: function (data: Uint8Array) { console.warn(`default COBSWebSerialLink.onData()...`) },
        onClose: function () { console.warn(`default COBSWebSerialLink.onClose()...`) },
      };
      // reading looks like a PITA, I'm looking at modular-things code and also 
      // this https://developer.chrome.com/articles/serial/ 
      // but it looks like we setup an infinite loop
      let infLoop = async () => {
        try {
          let data: number[] = [];
          let reader = null;
          while (port.readable) {
            reader = port.readable.getReader();
            while (true) {
              let { value, done } = await reader.read();
              // data was present, 
              if (value) {
                for (let v of value) {
                  if (v === 0) {
                    // deserialize and do onData, 
                    let pck = new Uint8Array(data)
                    // decode, 
                    let dec = COBS.decode(pck)
                    // console.warn(`rx'd this`, dec)
                    link.onData(dec);
                    data = []
                  } else {
                    data.push(v)
                  }
                }
              }
              // end of rx, close & bail, 
              if (done) {
                reader.releaseLock();
                reader = null;
                break;
              }
            }
          }
        } catch (err) {
          console.error(err)
        } finally {
          close();
        }
      } // end infloop 
      // kickoff the infinite loop, 
      infLoop()
      // and stuff it into our array, 
      this.openLinks.push(link);
      // call the new-thing, 
      this.onNewLink(link)
      // aaaand return to caller
      return link;
    } catch (err) {
      console.error(err)
    }
  }

  // startup 
  init = async () => {
    // do-once 
    if (this.initialized) return;
    this.initialized = true;
    // get / diff ports...
    this.rescan();
    // and setup listeners
    // connect listener... when already-approved thing is plugged in ?
    // @ts-expect-error
    navigator.serial.addEventListener('connect', async (event) => {
      console.warn(`serial connects...`, event.target);
      await this.setupPort(event.target as SerialPort);
    })
    // disconnects...
    // @ts-expect-error
    navigator.serial.addEventListener('disconnect', async (event) => {
      console.warn(`serial disconnects...`, event.target);
      // let's close it and wipe it, 
      let portIndex = this.openLinks.findIndex(cand => cand.underlyingPort == event.target);
      // if you've never opened a port, can you really close it ? 
      if (portIndex == -1) throw new Error(`a port that wasn't in our list-of-ports has closed (?)`);
      // carrying on, we close it:
      this.openLinks[portIndex].onClose();
      // and delete it 
      this.openLinks.splice(portIndex, 1);
    })
  }

  // scan for changes ? 
  rescan = async () => {
    // get a list 'o 
    // @ts-expect-error
    let ports = await navigator.serial.getPorts();
    // check existing open ports... diff... 
    for (let port of ports) {
      // carry on if we're already open... 
      if (this.openLinks.findIndex(cand => cand.underlyingPort == cand) != -1) continue;
      // otherwise.. 
      await this.setupPort(port);
    }
  }

  // request new ports...
  authorizeNewPort = async () => {
    // @ts-expect-error
    return await this.setupPort(await navigator.serial.requestPort());
  }
}
