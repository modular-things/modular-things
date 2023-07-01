/*

maxl-stepper.ts

motion control output device 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

*/

import { osap } from "../../osapjs/osap"
import Serializers from "../../osapjs/utils/serializers"
import Time from "../../osapjs/utils/time"

export default function maxlStepper(name: string) {
  // motor specific settings... 
  let settings = {
    actuatorID: 0,
    axisPick: 0,
    stepsPerUnit: 100,
    currentScale: 0.0
  }

  let messageTest = async () => {
    let datagram = new Uint8Array([12]);
    let res = await osap.send(name, "maxlMessages", datagram);
    console.log("returned...", res)
  }

  let publishSettings = async () => {
    let datagram = new Uint8Array(10);
    let wptr = 0;
    wptr += Serializers.writeUint8(datagram, wptr, settings.actuatorID);
    wptr += Serializers.writeUint8(datagram, wptr, settings.axisPick);
    wptr += Serializers.writeFloat32(datagram, wptr, settings.stepsPerUnit); // it's 0-1, firmware checks
    wptr += Serializers.writeFloat32(datagram, wptr, settings.currentScale);  // it's 0-1, firmware checks
    await osap.send(name, "writeMotorSettings", datagram);
  }

  let writeMaxlTime = async (time) => {
    // time is handed over here in *seconds* - we write microseconds as unsigned int, 
    let micros = Math.ceil(time * 1000000)
    let datagram = new Uint8Array(4);
    Serializers.writeUint32(datagram, 0, micros);
    let outTime = Time.getTimeStamp()
    await osap.send(name, "writeMaxlTime", datagram);
    let pingTime = Time.getTimeStamp() - outTime;
    return pingTime;
  }

  let appendMaxlSegment = async (datagram: Uint8Array) => {
    await osap.send(name, "appendMaxlSegment", datagram);
  }

  let getLimitState = async () => {
    let res = await osap.send(name, "getLimitState", new Uint8Array([0]));
    return res[0] ? true : false;
  }

  let halt = async () => {
    let datagram = new Uint8Array([0]);
    await osap.send(name, "maxlHalt", datagram);
  }

  return {
    updateName: (newName: string) => {
      name = newName;
    },
    // sneaky debug
    messageTest,
    setCurrentScale: async (currentScale: number) => {
      settings.currentScale = currentScale;
      await publishSettings();
    },
    setAxis: async (axis: number) => {
      settings.axisPick = axis;
      await publishSettings();
    },
    setStepsPerUnit: async (spu: number) => {
      settings.stepsPerUnit = spu;
      await publishSettings();
    },
    writeMaxlTime,
    appendMaxlSegment,
    getLimitState,
    halt,
    api: [], // TBD 
  }
}