// utes ! 

import Serializers from "../../osapjs/utils/serializers"
import { UnplannedSegment, PlannedSegment, ExplicitSegment } from "./maxl-types"

// addition...
let vectorAddition = (A: Array<number>, B: Array<number>) => {
  return A.map((a, i) => { return A[i] + B[i] })
}

// distances from a-to-b,
let vectorDeltas = (A: Array<number>, B: Array<number>) => {
  return A.map((a, i) => { return A[i] - B[i] })
}

// between A and B
let distance = (A: Array<number>, B: Array<number>) => {
  let numDof = A.length
  let sum = 0
  for (let a = 0; a < numDof; a++) {
    sum += Math.pow((A[a] - B[a]), 2)
  }
  return Math.sqrt(sum)
}

// from A to B
let unitVector = (A: Array<number>, B: Array<number>) => {
  let numDof = A.length
  let dist = distance(A, B)
  let unit = new Array(numDof)
  for (let a = 0; a < numDof; a++) {
    unit[a] = (B[a] - A[a]) / dist
  }
  return unit
}

let floatToFixed = (flt: number) : number => {
  if (isNaN(flt)) { throw new Error(`NaN in floatToFixed`) }
  let fixed = Math.round(flt * (2 ** 17))
  // let float = fixed / (2 ** 17)
  // console.log(flt, fixed, float)
  return fixed
}

let floatToUint32Micros = (flt: number): number => {
  if (isNaN(flt)) { throw new Error(`NaN in floatToUint32Micros`) }
  // seconds to microseconds, 
  let micros = Math.round(flt * 1000000)
  // console.warn(flt, micros)
  return micros
}

// this takes the explicit segment and packs it into a buffer 
let writeExplicitSegment = (exSeg: ExplicitSegment): Uint8Array => {
  let numDOF = exSeg.p1.length;
  let datagram = new Uint8Array(numDOF * 4 * 2 + 11 * 4 + 1);
  let wptr = 0;
  // sequencing data 
  wptr += Serializers.writeInt32(datagram, wptr, floatToUint32Micros(exSeg.timeStart));
  wptr += Serializers.writeInt32(datagram, wptr, floatToUint32Micros(exSeg.timeEnd));
  wptr += Serializers.writeBoolean(datagram, wptr, exSeg.isLastSegment);
  // start, dir, 
  for (let a = 0; a < numDOF; a++) {
    wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.p1[a]));
  }
  for (let a = 0; a < numDOF; a++) {
    wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.unit[a]));
  }
  // total distance, 
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.distTotal));
  // rates, 
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.vi));
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.accel));
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.vmax));
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.vf));
  // integrals, 
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.distAccelPhase));
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.distCruisePhase));
  // trapezoid times 
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.timeAccelEnd));
  wptr += Serializers.writeInt32(datagram, wptr, floatToFixed(exSeg.timeCruiseEnd));
  // that's it, 
  return datagram
}

// we write segments... from a more properly constrained set of info, 
// takes vi, vf, vmax, accel, p1, p2, and writes exSeg, 

// this takes a planned segment and pre-calclates all of 
// the info that low-level systems will need to execute it 
let calculateExplicitSegment = (seg: PlannedSegment, segmentStartTime: number): ExplicitSegment => {
  // we're buildingout this object, from that... 
  let exSeg = {
    // sequencing info
    timeStart: segmentStartTime,                // tbd
    timeEnd: 0,                                 // tbd
    isLastSegment: false,                       // sequencing, 
    // geo-metric info
    p1: JSON.parse(JSON.stringify(seg.p1)),  // copypasta this, just-in-case,  
    unit: unitVector(seg.p1, seg.p2),           // unit vector 
    // rates
    vi: seg.vi,                                 // already available
    accel: seg.accel,                           // already available
    vmax: seg.vmax,                             // already available
    vf: seg.vf,                                 // already available
    // integrals, 
    distTotal: distance(seg.p1, seg.p2),             // distance 
    distAccelPhase: 0,
    distCruisePhase: 0,
    // times 
    timeAccelEnd: 0,
    timeCruiseEnd: 0,
    timeTotal: 0,                                    // in real-seconds, 
  }
  // now we can look at what our max entry (given exit) and max exit (given entry) are, 
  let maxVi = Math.sqrt(seg.vi * seg.vi + 2 * seg.accel * exSeg.distTotal)
  let maxVf = Math.sqrt(seg.vf * seg.vf + 2 * seg.accel * exSeg.distTotal)
  // since we are with-big-cpu, we could do ~ handfuls of maths up front ? i.e. phase lengths... 
  // and we can do some trapezoid binning... 
  if (maxVf <= seg.vf) {
    // seg is `//`
    console.log(`seg: // ${exSeg.unit[0].toFixed(2)}`)
    console.error(JSON.parse(JSON.stringify(seg)))
    exSeg.distAccelPhase = exSeg.distTotal
    exSeg.distCruisePhase = 0
    // d = v * t 
    // d / t = v 
    // d / v = t 
    // d = ((vi + vf) / 2) * t
    // t = d / ((vi + vf) / 2)
    exSeg.timeAccelEnd = exSeg.distTotal / (0.5 * (exSeg.vi + exSeg.vf))
    exSeg.timeCruiseEnd = exSeg.timeAccelEnd
    exSeg.timeTotal = exSeg.timeAccelEnd
  } else if (maxVi <= seg.vi) {
    // seg is `\\` 
    console.log(`seg: \\\\ ${exSeg.unit[0].toFixed(2)}`)
    exSeg.distAccelPhase = 0
    exSeg.distCruisePhase = 0
    exSeg.timeAccelEnd = 0
    exSeg.timeCruiseEnd = 0
    // t = d / ((vi + vf) / 2)
    exSeg.timeTotal = exSeg.distTotal / (0.5 * (exSeg.vi + exSeg.vf))
  } else if (seg.vi == seg.vmax && seg.vmax == seg.vf) {
    // seg is `---`
    console.log(`seg: --- ${exSeg.unit[0].toFixed(2)}`)
    exSeg.distAccelPhase = 0
    exSeg.distCruisePhase = exSeg.distTotal
    exSeg.timeAccelEnd = 0
    // t = d / v 
    exSeg.timeTotal = exSeg.distTotal / exSeg.vmax
    exSeg.timeCruiseEnd = exSeg.timeTotal
  } else if (seg.vi == seg.vmax) {
    // seg is `---\\`
    console.log(`seg: ---\\\\ ${exSeg.unit[0].toFixed(2)}`)
    // vf^2 = vi^2 + 2ad 
    // d = (vf^2 - vi^2) / (2a)
    let decelDist = (seg.vmax * seg.vmax - seg.vf * seg.vf) / (2 * seg.accel)
    let decelTime = decelDist / (0.5 * (exSeg.vmax + exSeg.vf))
    exSeg.distAccelPhase = 0
    exSeg.distCruisePhase = exSeg.distTotal - decelDist
    exSeg.timeAccelEnd = 0
    exSeg.timeCruiseEnd = exSeg.distCruisePhase / exSeg.vmax
    exSeg.timeTotal = exSeg.timeCruiseEnd + decelTime
  } else if (seg.vf == seg.vmax) {
    // seg is `//---`
    console.log(`seg: //--\\\\ ${exSeg.unit[0].toFixed(2)}`)
    exSeg.distAccelPhase = (seg.vmax * seg.vmax - seg.vi * seg.vi) / (2 * seg.accel)
    exSeg.distCruisePhase = exSeg.distTotal - exSeg.distAccelPhase
    exSeg.timeAccelEnd = exSeg.distAccelPhase / (0.5 * (exSeg.vmax + exSeg.vi))
    exSeg.timeTotal = exSeg.timeAccelEnd + exSeg.distCruisePhase / exSeg.vmax
    exSeg.timeCruiseEnd = exSeg.timeTotal
  } else {
    // seg is either `//\\` or `//---\\`
    let accelDist = (seg.vmax * seg.vmax - seg.vi * seg.vi) / (2 * seg.accel)
    let decelDist = (seg.vmax * seg.vmax - seg.vf * seg.vf) / (2 * seg.accel)
    if (accelDist + decelDist >= exSeg.distTotal) {
      // seg is `//\\`
      console.log(`seg: //\\\\ ${exSeg.unit[0].toFixed(2)}`)
      // we need to figure when in time / or dist / the crossover happens, 
      // we know velocities at the peak are equal, 
      // vpeak^2 = vi^2 + 2ad_accel
      // vpeak^2 = vf^2 + 2ad_decel 
      //
      // and that these two distance add up... 
      // d = d_accel + d_decel 
      // 
      // so we can do the equality and pull out the d's
      // vi^2 + 2ad_accel = vf^2 + 2ad_decel
      // vi^2 - vf^2 = 2ad_decel - 2ad_accel 
      // (vi^2 - vf^2)/(2ad) = d_decel - d_accel 
      //
      // then sub in the distance-sum and pull out one of the distances: 
      // vi^2 + 2ad_accel = vf^2 + 2a(d-d_accel)
      // vi^2 - vf^2 = 2a(d-d_accel) - 2ad_accel
      // vi^2 - vf^2 = 2a(d-d_accel-d_accel)
      // (vi^2 - vf^2)/(2a) = d-2d_accel
      // (((vi^2 - vf^2)/(2a)) - d)/(-2) = d_accel
      // 
      // AFAIK this works, tbd: 
      exSeg.distAccelPhase = (((exSeg.vi * exSeg.vi - exSeg.vf * exSeg.vf) / (2 * exSeg.accel)) - exSeg.distTotal) / (-2)
      exSeg.distCruisePhase = 0
      // need that peak velocity, 
      // vf^2 = vi^2 + 2ad
      let vPeak = Math.sqrt(exSeg.vi * exSeg.vi + 2 * exSeg.accel * exSeg.distAccelPhase)
      // console.warn(`vPeak ${vPeak.toFixed(3)}`)
      exSeg.vmax = vPeak
      // vf = vi + at 
      // (vf - vi) / a = t
      exSeg.timeAccelEnd = (vPeak - exSeg.vi) / exSeg.accel
      exSeg.timeCruiseEnd = exSeg.timeAccelEnd
      exSeg.timeTotal = exSeg.timeAccelEnd + (vPeak - exSeg.vf) / exSeg.accel
      // that's it, innit ? 
    } else {
      // seg is `//---\\`
      console.log(`seg: //--\\\\ ${exSeg.unit[0].toFixed(2)}`)
      exSeg.distAccelPhase = accelDist
      exSeg.distCruisePhase = exSeg.distTotal - accelDist - decelDist
      exSeg.timeAccelEnd = accelDist / (0.5 * (exSeg.vmax + exSeg.vi))
      exSeg.timeCruiseEnd = exSeg.timeAccelEnd + exSeg.distCruisePhase / exSeg.vmax
      exSeg.timeTotal = exSeg.timeCruiseEnd + decelDist / (0.5 * (exSeg.vmax + exSeg.vf))
    }
  }
  exSeg.timeEnd = exSeg.timeStart + exSeg.timeTotal
  // console.warn(exSeg.timeEnd - exSeg.timeStart, exSeg.timeStart, exSeg.timeEnd)
  return exSeg
} // end calculateExplicitSegment 

export {
  vectorAddition,
  vectorDeltas,
  distance,
  unitVector,
  floatToFixed,
  floatToUint32Micros,
  writeExplicitSegment,
  calculateExplicitSegment
}