/*
machine.js

a "virtual machine" - of course 

Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

/*
const machine = createMachine(
  [motor1, motor2, motor3],
  (targetCoordinates) => { return transformedCoords },
  (motorCoordinates) => { return targetCoordinates }
)

machine.setMaxAccel(accel)
machine.setMaxVelocity(rate)
machine.absolute([x,y,z], rate = last, accel = last)
machine.relative([x,y,z], rate = last, accel = last)
machine.setPosition([x,y,z])
machine.stop()

// my thoughts / modifications:
- we can do without .setMaxAccel and .setMaxVelocity, those are user-impositions, 
  - rather use .absolute and .relative to have (..., rate, accel) arguments 
  - and let those args be modal: if they aren't supplied, use the most-recently-used, 
- how do we throw / catch errors, since machines call motors ? 
  - can we do a higher-level wrap so that we can throw 'em always all the way up to user code ? 
- also... .setPosition / etc, is a function of the transform, innit ? 
- transforms for *position* are not identical to *velocity* transforms, 
  - if the transform is linear, we should be able to just use a delta transform... 
  - nonlinear (i.e. angular) transforms leave us fully beached for velocities, etc (?) 
- this is complex in surprising ways... 
*/

export default function createMachine(actuators, machineToActuatorTransform, actuatorToMachineTransform) {
  // yonder machine 
  let machine = {}
  if (!Array.isArray(actuators)) throw new Error(`pls, an array of actuators`)

  // attach these... 
  machine.actuators = actuators

  // default to 1:1 transforms, 
  if (!machineToActuatorTransform) {
    machine.machineToActuatorTransform = (machineSpace) => {
      return machineSpace
    }
    machine.actuatorToMachineTransform = (actuatorSpace) => {
      return actuatorSpace
    }
  }
  // some state... our most-recently used accel & velocity, 
  // there's going to be a little bit of trouble w/r/t motor absolute-max-velocities 
  // and what the machine. requests of them, 
  let lastAccel = 100
  let lastVel = 100
  // sometimes we know this, and that can speed things up, other times we are unawares 
  let lastMachinePosition = null

  // wait-for-stop, 
  machine.awaitMotionEnd = async () => {
    try {
      // just await all stop, 
      await Promise.all(machine.actuators.map(actu => actu.awaitMotionEnd()))
    } catch (err) {
      console.error(err)
    }
  }

  // goto this abs position, 
  machine.absolute = async (pos, vel, accel) => {
    try {
      // modal vel-and-accels,
      vel ? lastVel = vel : vel = lastVel;
      accel ? lastAccel = accel : accel = lastAccel;
      // if we don't know the lastest machine position, grab it... 
      if (!lastMachinePosition) lastMachinePosition = await machine.getPosition()
      // and get current -> next positions in actuator space... 
      let lastActuatorPosition = machine.machineToActuatorTransform(lastMachinePosition)
      let nextActuatorPosition = machine.machineToActuatorTransform(pos)
      // so, vel & accel here are denoted in machine space, whereas actuators are called... in actuator space, lol 
      // and transforms are not the same as we drop thru derivatives, so we have some pickles 
      // time being, I'm going to apply everything in actuator space... vel limits, etc, 
      // ...
      // we're also going to need to know about each motor's abs-max velocities:
      let absMaxVelocities = machine.actuators.map(actu => actu.getAbsMaxVelocity())
      // calculate deltas for each axis, 
      let deltas = deltas(lastActuatorPosition, nextActuatorPosition)
      // and a unit vector... I know this should be explicit unitize-an-existing-vector, alas, 
      let unit = unitVector(lastActuatorPosition, nextActuatorPosition)
      // these are our candidate rates, 
      let velocities = unit.map((u, i) => { return Math.abs(unit[i] * vel) })
      // but some might be too large, check thru and assign the biggest-squish, 
      let scaleFactor = 1.0
      for (let a in machine.actuators) {
        if (velocities[a] > absMaxVelocities[a]) {
          let candidateScale = absMaxVelocities[a] / velocities[a]
          if (candidateScale < scaleFactor) scaleFactor = candidateScale;
        }
      }
      // apply that factor, ... am I using .map properly ? 
      velocities = velocities.map(a => a * scaleFactor)
      // finally, what are per-axis accels ?
      let accels = unit.map((u, i) => { return Math.abs(unit[i] * accel) })
      // ok, sheesh, I think we can write 'em, 
      await Promise.all(machine.actuators.map((actu, i) => { 
        return actu.absolute(nextActuatorPosition[i], velocities[i], accels[i]) 
      }))
      // then await all stop, 
      await machine.awaitMotionEnd()
      // and finally, set this, 
      lastMachinePosition = pos
    } catch (err) {
      console.error(err)
    }
  }

  // move relative... 
  machine.relative = async (deltas, vel, accel) => {

  }

  // get position... 
  // consider: should this do machine.getStates() ? 
  machine.getPosition = async () => {
    // get each-actuator pos and apply transform, 
    // unless we already know it... 
    // (1) get actuator positions (?) or we kind of know 'em don't we - 
    // (2) apply the transform and carry on 
  }

  // halt... 
  machine.stop = async () => {
    // (1) set velocity-targets across all to zero, 
    // (2) await motion end across all, 
    // (3) collect new position, given that some unknown amount of decelleration occured 
  }

  // move at a velocity... 
  machine.move = async (vels, accel) => {
    throw new Error('not yet implemented')
    /*
    I'm leaving this off, since it will require that we do:
      - track mode, so that if we are in a velocity-mode, then see a position-mode request, we can halt and swap 
    */
  }

  // set the position 
  machine.setPosition = async (pos) => {
    throw new Error(`not yet implemented`)
    /*
    likewise, this is tricky with unknown transforms (!) 
    I would say that, for varying WCS, those should be made explicit to users, 
    since otherwise it's basically just inviting uninspected state and confusion... 
    */
  }

}

// distances from a-to-b, 
let deltas = (A, B) => {
  return A.map((a, i) => { return A[i] - B[i] })
}

// between A and B 
let distance = (A, B) => {
  let sum = 0
  for (let a = 0; a < numDof; a++) {
    sum += Math.pow((A[a] - B[a]), 2)
  }
  return Math.sqrt(sum)
}

// from A to B 
let unitVector = (A, B) => {
  let dist = distance(A, B)
  let unit = new Array(numDof)
  for (let a = 0; a < numDof; a++) {
    unit[a] = (B[a] - A[a]) / dist
  }
  return unit
}