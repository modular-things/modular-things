let corexy = createSynchronizer([amotor, bmotor])
console.log(corexy)

amotor.setCScale(0.75)
amotor.setSPU(20)
bmotor.setCScale(0.75)
bmotor.setSPU(20)

amotor.setVelocity(500)
amotor.setAccel(750)
bmotor.setVelocity(500)
bmotor.setAccel(750)

// let's do... get-set 
loop(async () => {
  let posns = await Promise.all([joypot.readPotentiometer(0), joypot.readPotentiometer(1)])
  posns[0] *= 100
  posns[1] *= 100
  await corexy.target(posns)
}, 100)