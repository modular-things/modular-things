/*
vPortSerial.js

link layer 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS } from "../core/ts.js";
import TIME from "../core/time.js";
import COBS from "../utes/cobs.js";
import OSAP from "../core/osap.js";
import { nanoid } from "nanoid";

// have some "protocol" at the link layer
// buffer is max 256 long for that sweet sweet uint8_t alignment
let SERLINK_BUFSIZE = 255;
// -1 checksum, -1 packet id, -1 packet type, -2 cobs
let SERLINK_SEGSIZE = SERLINK_BUFSIZE - 5;
// packet keys;
let SERLINK_KEY_PCK = 170; // 0b10101010
let SERLINK_KEY_ACK = 171; // 0b10101011
let SERLINK_KEY_DBG = 172;
let SERLINK_KEY_KEEPALIVE = 173; // keepalive ping
// retry settings
let SERLINK_RETRY_MACOUNT = 2;
let SERLINK_RETRY_TIME = 100; // milliseconds
let SERLINK_KEEPALIVE_TX_TIME = 800; // ms, dead-time interval before sending an 'i'm-still-here' ping
let SERLINK_KEEPALIVE_RX_TIME = 1200; // ms, dead-time interval before assuming neighbour is dead

export default async function VPortWebSerial(osap: OSAP, port: SerialPort, debug = false) {
    let status: string = "opening";
    let portName: string = nanoid();

    // make the vport object (will auto attach to osap)
    let vport = osap.vPort(portName);
    vport.maxSegLength = 255;
    // open the port itself,
    if (debug) console.log(`SERPORT contact at ${portName}, opening`);
    // we keep a little state, as a treat
    let outAwaiting: Uint8Array | null = null;
    let outAwaitingId = 1;
    let outAwaitingTimer: number | null = null;
    let numRetries = 0;
    let lastIdRxd = 0;
    let lastRxTime = 0; // last time we heard back ? for keepalive
    // flowcontrol is based on this state,
    let flowCondition = () => outAwaiting == null;
    // we report flowcondition,
    //@ts-expect-error
    vport.cts = () => {
        return status == "open" && flowCondition();
    };
    // and open / closed-ness,
    //@ts-expect-error
    vport.isOpen = () => {
        return (
            status == "open" &&
            TIME.getTimeStamp() - lastRxTime < SERLINK_KEEPALIVE_RX_TIME
        );
    };
    // we have a port...
    await port.open({
        baudRate: 9600,
        // flowControl: "none"
    });

    // we track remote open spaces, this is stateful per link...
    console.log(`SERPORT at ${portName} OPEN`);
    // is now open,
    status = "open";
    // we do some keepalive,
    let keepAliveTimer: number | null = null;
    // we can manually write this,
    let keepAlivePacket = new Uint8Array([3, SERLINK_KEY_KEEPALIVE, 0]);
    // clear current keepAlive timer and set new one,
    let keepAliveTxUpdate = () => {
        if (keepAliveTimer) {
            clearTimeout(keepAliveTimer);
        }
        keepAliveTimer = window.setTimeout(async () => {
            /*
            const writer = port.writable.getWriter();
            const data = new Uint8Array([104, 101, 108, 108, 111]); // hello
            await writer.write(data);
            // Allow the serial port to be closed later.
            writer.releaseLock();
            */
            if(port.writable) {
                const writer = port.writable!.getWriter();
                await writer.write(keepAlivePacket);
                writer.releaseLock();
                keepAliveTxUpdate();
            } else {
                clearTimeout(keepAliveTimer!);
            }
        }, SERLINK_KEEPALIVE_TX_TIME);
    };
    // also set last-rx to now, and init keepalive state,
    lastRxTime = TIME.getTimeStamp();
    keepAliveTxUpdate();

    const onData = async (buf: number[]) => {
        lastRxTime = TIME.getTimeStamp();
        if (debug) console.log("SERPORT Rx", buf);
        // checksum...
        if (buf.length + 1 != buf[0]) {
            console.log(
                `SERPORT Rx Bad Checksum, ${buf[0]} reported, ${buf.length} received`
            );
            return;
        }
        // ack / pack: check and clear, or noop
        switch (buf[1]) {
            case SERLINK_KEY_ACK:
                if (buf[2] == outAwaitingId) outAwaiting = null;
                break;
            case SERLINK_KEY_PCK:
                if (buf[2] == lastIdRxd) {
                    console.log(`SERPORT Rx double id ${buf[2]}`);
                    return;
                } else {
                    lastIdRxd = buf[2];
                    let decoded = COBS.decode(buf.slice(3));
                    await vport.awaitStackAvailableSpace(0, 2000);
                    //console.log('SERPORT RX Decoded', decoded)
                    vport.receive(decoded);
                    // output an ack,
                    let ack = new Uint8Array(4);
                    ack[0] = 4;
                    ack[1] = SERLINK_KEY_ACK;
                    ack[2] = lastIdRxd;
                    ack[3] = 0;
                    const writer = port.writable!.getWriter();
                    await writer.write(ack);
                    writer.releaseLock();        
                }
                break;
            case SERLINK_KEY_DBG:
                {
                    let decoded = COBS.decode(buf.slice(2));
                    //@ts-expect-error
                    let str = TS.read("string", decoded, 0).value;
                    console.log("LL: ", str);
                }
                break;
            case SERLINK_KEY_KEEPALIVE:
                // this is just for updating lastRxTime...
                break;
            default:
                console.error(`SERPORT Rx unknown front-key ${buf[1]}`);
                break;
        }
    };

    // implement tx
    //@ts-expect-error
    let writer = null;
    vport.send = async (buffer: Uint8Array) => {
        // double guard, idk
        if (!flowCondition()) return;
        // buffers, uint8arrays, all the same afaik
        // we are len + cobs start + cobs delimit + pck/ack + id + checksum ?
        outAwaiting = new Uint8Array(buffer.length + 5);
        outAwaiting[0] = buffer.length + 5;
        outAwaiting[1] = SERLINK_KEY_PCK;
        outAwaitingId++;
        if (outAwaitingId > 255) outAwaitingId = 1;
        outAwaiting[2] = outAwaitingId;
        outAwaiting.set(COBS.encode(buffer), 3);
        // reset retry states
        outAwaitingTimer !== null && clearTimeout(outAwaitingTimer);
        numRetries = 0;
        // ship eeeet
        if (debug) console.log("SERPORT Tx", outAwaiting);

        writer = port.writable!.getWriter();
        await writer.write(outAwaiting);
        writer.releaseLock();
        writer = null;

        keepAliveTxUpdate();
        // retry timeout, in reality USB is robust enough, but codes sometimes bungle messages too
        outAwaitingTimer = window.setTimeout(async () => {
            if (
                outAwaiting &&
                numRetries < SERLINK_RETRY_MACOUNT &&
                port.writable
            ) {
                const writer = port.writable!.getWriter();
                await writer.write(outAwaiting);
                writer.releaseLock();
                keepAliveTxUpdate();
                numRetries++;
            } else if (!outAwaiting) {
                // noop
            } else {
                // cancel
                outAwaiting = null;
            }
        }, SERLINK_RETRY_TIME);
    };

    let reader = null;
    new Promise(async () => {
        try {
            let data: number[] = [];
            while(port.readable) {
                reader = port.readable.getReader();
                while(true) {
                    const { value, done } = await reader.read();
                    if(value) {
                        for(const v of value) {
                            if(v === 0) {
                                await onData(data);
                                data = [];
                            } else {
                                data.push(v);
                            }
                        }
                    }
                    if (done) {
                        reader.releaseLock();
                        reader = null;
                        break;
                    }
                    // if(value) console.log(value);
                }
            }
        } catch(err) {
            console.error(err);
        }

        // finally {
        //     vport.dissolve();
        //     await port.close();
        //     console.log(`SERPORT ${portName} closed`);
        //     status = "closed";
        // }
    });

    async function close() {
        console.log(reader, port);
        if (reader) reader.releaseLock();
        if (writer) writer.releaseLock();

        vport.dissolve();
        await port.close();
        console.log(`SERPORT ${portName} closed`);
        status = "closed";
        reader = null;
        writer = null;
    }

    return { status, portName, close };
}