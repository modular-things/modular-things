/*
synchronizer.js

a "virtual machine" - of course

Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

/*
TODO:
a typescript implementation would be rad for standalones, using typescript motors... 
can we have that and also have it live within the browser-env ? 
*/

let vectorAddition = (A, B) => {
  return A.map((a, i) => { return A[i] + B[i] })
}


let distance = (A, B) => {
  let numDof = A.length
  let sum = 0
  for (let a = 0; a < numDof; a++) {
    sum += Math.pow((A[a] - B[a]), 2)
  }
  return Math.sqrt(sum)
}


let unitVector = (A, B) => {
  let numDof = A.length
  let dist = distance(A, B)
  let unit = new Array(numDof)
  for (let a = 0; a < numDof; a++) {
    unit[a] = (B[a] - A[a]) / dist
  }
  return unit
}


export default function createSynchronizer(actuators) {
  // it's true, 
  console.warn(`WARNING: Sync is untested since (small) motor API changes...`)

  if (!Array.isArray(actuators)) throw new Error(`pls, an array of actuators`)
  // some state... our most-recently used accel & velocity,
  // there's going to be a little bit of trouble w/r/t motor absolute-max-velocities
  // and what the machine. requests of them,
  let lastAccel = 100
  let lastVel = 100
  // sometimes we know this, and that can speed things up, other times we are unawares
  let lastAbsolute = null

  // -------------------------------------------- Setters

  let setPosition = async (pos) => {
    try {
      // we... should guard against same-sizeness as well, yikes
      if (!Array.isArray(pos)) throw new Error(`pls, an array of posns, to set`)
      await Promise.all(actuators.map((actu, i) => { return actu.setPosition(pos[i]) }))
    } catch (err) {
      console.error(err)
    }
  }

  // set... the speed we'd like to travel, in straight lines...
  let setVelocity = (vel) => { lastVel = vel }

  // and the accel to use,
  let setAccel = (accel) => { lastAccel = accel }

  // -------------------------------------------- Getters

  let getPosition = async () => {
    try {
      let posns = await Promise.all(actuators.map(actu => actu.getPosition()))
      return posns
    } catch (err) {
      console.error(err)
    }
  }

  let getVelocity = async () => {
    try {
      let vels = await Promise.all(actuators.map(actu => actu.getVelocity()))
      return vels
    } catch (err) {
      console.error(err)
    }
  }

  // -------------------------------------------- Operative

  let awaitMotionEnd = async () => {
    try {
      // just await all stop,
      await Promise.all(actuators.map(actu => actu.awaitMotionEnd()))
    } catch (err) {
      console.error(err)
    }
  }

  let target = async (pos, vels, accels) => {
    try {
      // set all downstream...
      await Promise.all(actuators.map((actu, i) => { 
        return actu.target(pos[i], vels ? vels[i] : undefined, accels ? accels[i] : undefined) 
      }))
      // can't know this anymore,
      lastAbsolute = null
    } catch (err) {
      console.error(err)
    }
  }

  // goto this absolute actuator-position
  let absolute = async (pos, vel, accel) => {
    try {
      // modal vel-and-accels,
      vel ? lastVel = vel : vel = lastVel;
      accel ? lastAccel = accel : accel = lastAccel;
      // if we don't know the lastest machine position, grab it...
      if (!lastAbsolute) lastAbsolute = await getPosition()
      // where we're going...
      let nextAbsolute = pos
      // we're also going to need to know about each motor's abs-max velocities:
      let absMaxVelocities = actuators.map(actu => actu.getMaxVelocity())
      let absMaxAccels = actuators.map(actu => actu.getMaxAccel())
      // and a unit vector... I know this should be explicit unitize-an-existing-vector, alas,
      let unit = unitVector(lastAbsolute, nextAbsolute)
      // these are our candidate vels & accels for the move,
      let velocities = unit.map((u, i) => { return Math.abs(unit[i] * vel) })
      let accels = unit.map((u, i) => { return Math.abs(unit[i] * accel) })
      // but some vels or accels might be too large, check thru and assign the biggest-squish to everything,
      let scaleFactor = 1.0
      for (let a in actuators) {
        if (velocities[a] > absMaxVelocities[a]) {
          let candidateScale = absMaxVelocities[a] / velocities[a]
          if (candidateScale < scaleFactor) scaleFactor = candidateScale;
        }
        if (accels[a] > absMaxAccels[a]) {
          let candidateScale = absMaxAccels[a] / accels[a]
          if (candidateScale < scaleFactor) scaleFactor = candidateScale;
        }
      }
      // apply that factor to *both* vels and accels,
      velocities = velocities.map(v => v * scaleFactor)
      accels = accels.map(a => a * scaleFactor)
      // ok, sheesh, I think we can write 'em, do this with promise.all so that
      // each message dispatches ~ at the same time, thusly arriving ~ at the same time, to get-sync'd
      await Promise.all(actuators.map((actu, i) => {
        return actu.absolute(nextAbsolute[i], velocities[i], accels[i])
      }))
      // motors each await-motion-end, when we await-all .absolute, so by this point we have made the move... can do
      lastAbsolute = pos
    } catch (err) {
      console.error(err)
    }
  }

  // move relative...
  let relative = async (deltas, vel, accel) => {
    try {
      // if we don't know the lastest machine position, grab it...
      if (!lastAbsolute) lastAbsolute = await getPosition()
      // and just... do...
      let nextAbsolute = vectorAddition(lastAbsolute, deltas)
      await absolute(nextAbsolute, vel, accel)
    } catch (err) {
      console.error(err)
    }
  }

  // we want the motor to go along this velocity vector, probably with matched acceleration,
  let velocity = async (vels, accel) => {
    try {
      if (!Array.isArray(vels)) throw new Error(`pls, a velocity vector here`)
      accel ? lastAccel = accel : accel = lastAccel;
      // so we need to collect the motors' absolute max accels,
      let absMaxAccels = actuators.map(actu => actu.getMaxAccel())
      // get a unito,
      let unit = unitVector(vels)
      // as above, so here (below), we need to check accels, vels, against possible...
      let accels = unit.map((u, i) => { return Math.abs(unit[i] * accel) })
      let velocities = vels // erp,
      // might be toooo bigly,
      let scaleFactor = 1.0
      for(let a in actuators){
        if (velocities[a] > absMaxVelocities[a]) {
          let candidateScale = absMaxVelocities[a] / velocities[a]
          if (candidateScale < scaleFactor) scaleFactor = candidateScale;
        }
        if (accels[a] > absMaxAccels[a]) {
          let candidateScale = absMaxAccels[a] / accels[a]
          if (candidateScale < scaleFactor) scaleFactor = candidateScale;
        }
      }
      // apply that factor to *both* vels and accels,
      velocities = velocities.map(v => v * scaleFactor)
      accels = accels.map(a => a * scaleFactor)
      // ok, we have a set of accels, now we can do like...
      await Promise.all(actuators.map((actu, i) => {
        return actu.velocity(velocities[i], accels[i])
      }))
    } catch (err) {
      console.error(err)
    }
  }

  // halt...
  let stop = async () => {
    try {
      // (1) set velocity-targets across all to zero,
      await Promise.all(actuators.map(actu => actu.stop()))
      // (2) collect new position, given that some unknown amount of decelleration occured
      lastAbsolute = await getPosition()
    } catch (err) {
      console.error(err)
    }
  }

  return {
    // listicle,
    actuators,
    // operate w/
    target,
    absolute,
    relative,
    velocity,
    stop,
    awaitMotionEnd,
    // setters
    setPosition,
    setVelocity,
    setAccel,
    // getters,
    getPosition,
    getVelocity,
  }
}
