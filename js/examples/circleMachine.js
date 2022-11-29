let corexy = createSynchronizer([amotor, bmotor])
console.log(corexy)

amotor.setCScale(0.55)
amotor.setSPU(20)
bmotor.setCScale(0.55)
bmotor.setSPU(20)

// in rads 
let radius = 25
for(let i = 0; i < 100; i += 0.2){
  let coord = [Math.sin(i) * radius, Math.cos(i) * radius]
  console.log(coord)
  await corexy.absolute(coord, 1000, 10000)
}