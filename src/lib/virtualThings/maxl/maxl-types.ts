// let's define... an unplanned move-type? 
// and an explicit (planned) type ? 

export type UnplannedSegment = {
  p1: Array<number>,
  p2: Array<number>,
  vmax: number, 
  accel: number, 
}

export type PlannedSegment = UnplannedSegment & {
  vi: number, 
  vf: number, 
  explicit?: ExplicitSegment,
  transmitTime: number,
  next?: PlannedSegment,
  prev?: PlannedSegment,
}

// it does seem as though... there could be some simpler representation ? 
// think about describing time-vs-position *and* time-vs-rate ? 

export type ExplicitSegment = {
  // time-wise, 
  timeStart: number, 
  timeEnd: number, 
  isLastSegment: boolean, 
  // positional 
  p1: Array<number>,
  unit: Array<number>,
  // rates, 
  vi: number, 
  accel: number, 
  vmax: number,
  vf: number, 
  // pre-calc'd times (seconds):
  timeTotal: number, 
  timeAccelEnd: number, 
  timeCruiseEnd: number, 
  // pre-calc'd integrals:
  distTotal: number, 
  distAccelPhase: number, 
  distCruisePhase: number, 
}
