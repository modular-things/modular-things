#include "motionStateMachine.h"
#include "fixedPointUtes.h"
#include "stepperDriver.h"

// we can take some pin over to do debuggen... 
#define PIN_DEBUG 26 

#define ALARM_DT_NUM 1
#define ALARM_DT_IRQ TIMER_IRQ_1

// _delT is re-calculated when we init w/ a new microsecondsPerIntegration 
fpint32_t           _delT = 0;
uint32_t            _delT_us = 0;
// core states (units are full steps) 
volatile uint8_t    _mode = MOTION_MODE_POS;    // operative _mode 
volatile fpint64_t  _pos = 0;                   // current position (big 64)
volatile fpint32_t  _vel = 0;                   // current velocity 
volatile fpint32_t  _accel = 0;                 // current acceleration 
// and settings 
fpint32_t           _maxAccel = 0;              // maximum acceleration
fpint32_t           _maxVelocity = 0;
// init-once values we'll use in the integrator 
volatile fpint32_t  _delta = 0;

void motion_init(uint32_t microsecondsPerIntegration){
  // here's our delta-tee for each integration step 
  _delT = fp_floatToFixed32((float)(microsecondsPerIntegration) / 1000000.0F);
  // and (for resetting our timer) the _delta directly in us 
  _delT_us = microsecondsPerIntegration;

  // we absolutely cannot step more than one tick-per-integration cycle, 
  // since we are in one-step-per-unit land, it means our absMax is just 1/_delT, 
  // TODO: this would be... something insane, since now we are only limited
  // by one full step per delta-tee, so it's like 256 microsteps, etc... 
  // absMaxVelocity = 1.0F / _delT; 
  // max_vel = absMaxVelocity; // start here, 

  hw_set_bits(&timer_hw->inte, 1u << ALARM_DT_NUM);
  irq_set_exclusive_handler(ALARM_DT_IRQ, alarm_dt_Handler);
  irq_set_enabled(ALARM_DT_IRQ, true);
  timer_hw->alarm[ALARM_DT_NUM] = (uint32_t) (timer_hw->timerawl + _delT_us);

  pinMode(PIN_DEBUG, OUTPUT);
}

void alarm_dt_Handler(void){
  // setup next call right away
  hw_clear_bits(&timer_hw->intr, 1u << ALARM_DT_NUM);
  timer_hw->alarm[ALARM_DT_NUM] = (uint32_t) (timer_hw->timerawl + _delT_us);
  // do the motion system integration, 
  sio_hw->gpio_set = (uint32_t)(1 << PIN_DEBUG);
  motion_integrate(); 
  sio_hw->gpio_clr = (uint32_t)(1 << PIN_DEBUG);
}

void motion_debug(void){
  Serial.println(String(millis())
      // + "\t_delT: \t" + String(fp_fixed32ToFloat(_delT), 6)
      + "\tpos: \t" + String(fp_fixed64ToFloat(_pos), 4)
      + "\tvel: \t" + String(fp_fixed32ToFloat(_vel), 4)
      + "\tvtrg: \t" + String(fp_fixed32ToFloat(_maxVelocity), 4)
      + "\tacc: \t" + String(fp_fixed32ToFloat(_accel), 3)
    );
}

void motion_integrate(void){
  // set our _accel based on modal requests, 
  switch(_mode){
    case MOTION_MODE_POS:
      break;
    case MOTION_MODE_VEL:
      if(_vel < _maxVelocity){
        _accel = _maxAccel; 
      } else if (_vel > _maxVelocity){
        _accel = -_maxAccel;
      }
      break;
  }
  // using our chosen accel, integrate velocity from previous: 
  _vel += fp_mult32x32(_accel, _delT); // _accel * _delT;
  // cap our _vel based on maximum rates: 
  // we have to be careful with signs ! 
  if(_vel > 0 && _maxVelocity > 0 && _vel > _maxVelocity){
    _accel = 0;
    _vel = _maxVelocity;
  } else if(_vel < 0 && _maxVelocity < 0 && _vel < _maxVelocity){
    _accel = 0;
    _vel = _maxVelocity;
  }
  // what's a position _delta ? 
  _delta = fp_mult32x32(_vel, _delT); // _vel * _delT;
  // integrate posn with _delta 
  _pos += _delta;

  // OK so, we are down here in hi-perfland, 
  // and everything comes to us steps-wise, full-steps wise ? 
  // and a full step for us is 512, 2^9, we should be able 
  // to just take a bitmask of the position, right?

  // position is base 16, we can just shift our way to relative electrical phase 
  // 0-2048 (11 bits) per electrical phase, is
  // 0-512 (9 bits) per step, 
  // 0b XXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXX
  // 0b               XX.XXXXXXXXX
  //                  FS.MicroStep
  uint16_t phaseAngle = (_pos >> 7) & 0b11111111111;
  stepper_point(phaseAngle);
} // end integrator 

void motion_setVelocityTarget(float target, float maxAccel){
  noInterrupts();
  _maxAccel = fp_floatToFixed32(abs(maxAccel));
  _maxVelocity = fp_floatToFixed32(target);
  _mode = MOTION_MODE_VEL;
  interrupts();
}

void motion_setPosition(float pos){
  // TODO: we should halt ahead of this, non? could fk shit up bigtime 
  _pos = fp_floatToFixed64(pos);
}

void motion_getCurrentStates(motionState_t* statePtr){
  noInterrupts();
  statePtr->pos = fp_fixed64ToFloat(_pos);
  statePtr->vel = fp_fixed32ToFloat(_vel);
  statePtr->accel = fp_fixed32ToFloat(_accel);
  interrupts();
}

void motion_setPositionTarget(float target, float maxVel, float maxAccel){
  noInterrupts();
  // let's collect the current states as floats, initial position and velocity, 
  float xi = fp_fixed64ToFloat(_pos);
  float vi = fp_fixed32ToFloat(_vel);
  // also the accel / vel we're going to use, 
  float vel = abs(maxVel);
  float accel = abs(maxAccel);
  // we'd like a total length of the move, 
  float dx = target - xi;
  // given those states, 

  // set our _mode, 
  _mode = MOTION_MODE_POS;
  interrupts();
}


/*
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
    if (log) console.log(`ESX: seg: // ${exSeg.unit[0].toFixed(2)}`);
    // console.error(JSON.parse(JSON.stringify(seg)))
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
    if (log) console.log(`ESX: seg: \\\\ ${exSeg.unit[0].toFixed(2)}`);
    exSeg.distAccelPhase = 0
    exSeg.distCruisePhase = 0
    exSeg.timeAccelEnd = 0
    exSeg.timeCruiseEnd = 0
    // t = d / ((vi + vf) / 2)
    exSeg.timeTotal = exSeg.distTotal / (0.5 * (exSeg.vi + exSeg.vf))
  } else if (seg.vi == seg.vmax && seg.vmax == seg.vf) {
    // seg is `---`
    if (log) console.log(`ESX: seg: --- ${exSeg.unit[0].toFixed(2)}`);
    exSeg.distAccelPhase = 0
    exSeg.distCruisePhase = exSeg.distTotal
    exSeg.timeAccelEnd = 0
    // t = d / v 
    exSeg.timeTotal = exSeg.distTotal / exSeg.vmax
    exSeg.timeCruiseEnd = exSeg.timeTotal
  } else if (seg.vi == seg.vmax) {
    // seg is `---\\`
    if (log) console.log(`ESX: seg: ---\\\\ ${exSeg.unit[0].toFixed(2)}`);
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
    if (log) console.log(`ESX: seg: //-- ${exSeg.unit[0].toFixed(2)}`);
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
      if (log) console.log(`ESX: seg: //\\\\ ${exSeg.unit[0].toFixed(2)}`);
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
      if (log) console.log(`ESX: seg: //--\\\\ ${exSeg.unit[0].toFixed(2)}`);
      exSeg.distAccelPhase = accelDist
      exSeg.distCruisePhase = exSeg.distTotal - accelDist - decelDist
      exSeg.timeAccelEnd = accelDist / (0.5 * (exSeg.vmax + exSeg.vi))
      exSeg.timeCruiseEnd = exSeg.timeAccelEnd + exSeg.distCruisePhase / exSeg.vmax
      exSeg.timeTotal = exSeg.timeCruiseEnd + decelDist / (0.5 * (exSeg.vmax + exSeg.vf))
    }
  }
  exSeg.timeEnd = exSeg.timeStart + exSeg.timeTotal
  */