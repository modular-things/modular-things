let machine = createSynchronizer([ymotor, xmotor])
console.log(machine)

ymotor.setCScale(0.55)
ymotor.setSPU(20)
xmotor.setCScale(0.55)
xmotor.setSPU(20)

// in rads 
let radius = 100
for(let i = 0; i < 100; i += 0.1){
  let coord = [Math.sin(i) * radius, Math.cos(i) * radius]
  console.log(coord)
  await machine.absolute(coord, 1000, 2000)
}