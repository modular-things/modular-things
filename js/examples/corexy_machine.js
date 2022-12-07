let corexy = createSynchronizer([aMotor, bMotor])
console.log(corexy)

let corexy_transform = (pos, flip=false) => {
  if (flip)
    s = -1;
  else
    s = 1;
  return [s*(pos[0] + pos[1]), s*(pos[0] - pos[1])];
}

let moveTo = async (pos, vel=140, acc=700, flip=true) => {
  await corexy.absolute(corexy_transform(pos, flip), vel, acc);
}

let do_grid = async (n_x, n_y, wait_ms) => {
  let w = 150;
  let h = 180;
  let x_step = w/(n_x-1);
  let y_step = h/(n_y-1);
  for (let j = 0; j < n_y; j++) {
    for (let i = 0; i < n_x; i++) {
      await moveTo([i*x_step, j*y_step]);
      await sleep(wait_ms);
    }
  }
}

await aMotor.setCurrentScale(0.75)
await aMotor.setStepsPerUnit(4 * 200 / 36)
await bMotor.setCurrentScale(0.75)
await bMotor.setStepsPerUnit(4 * 200 / 36)

await do_grid(4, 4, 100);
await moveTo([0, 0]);

await aMotor.setCurrentScale(0)
await bMotor.setCurrentScale(0)
