console.warn(`BEGIN --------------------------------------------`);

let _ = 0;
let X = 1;

let bitmapHello = [
  [_,X,_,_,X,_,X,X,X,X,_,X,_,_,_,_,X,_,_,_,_,X,X,X,X,_,_,_,_,_,_,_,],
  [_,X,_,_,X,_,X,_,_,_,_,X,_,_,_,_,X,_,_,_,_,X,_,_,X,_,_,_,_,_,_,_,],
  [_,X,_,_,X,_,X,_,_,_,_,X,_,_,_,_,X,_,_,_,_,X,_,_,X,_,_,_,_,_,_,_,],
  [_,X,X,X,X,_,X,X,X,X,_,X,_,_,_,_,X,_,_,_,_,X,_,_,X,_,_,_,_,_,_,_,],
  [_,X,_,_,X,_,X,_,_,_,_,X,_,_,_,_,X,_,_,_,_,X,_,_,X,_,_,_,_,_,_,_,],
  [_,X,_,_,X,_,X,_,_,_,_,X,_,_,_,_,X,_,_,_,_,X,_,_,X,_,_,_,_,_,_,_,],
  [_,X,_,_,X,_,X,X,X,X,_,X,X,X,X,_,X,X,X,X,_,X,X,X,X,_,_,_,_,_,_,_,],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,],
];

let bitmapWorld = [
  [_,X,_,_,_,_,_,X,_,X,X,X,X,_,X,X,X,_,_,X,_,_,_,_,X,X,X,_,_,_,_,_,],
  [_,X,_,_,_,_,_,X,_,X,_,_,X,_,X,_,_,X,_,X,_,_,_,_,X,_,_,X,_,_,_,_,],
  [_,X,_,_,_,_,_,X,_,X,_,_,X,_,X,_,_,X,_,X,_,_,_,_,X,_,_,X,_,_,_,_,],
  [_,X,_,_,_,_,_,X,_,X,_,_,X,_,X,X,X,_,_,X,_,_,_,_,X,_,_,X,_,_,_,_,],
  [_,X,_,_,X,_,_,X,_,X,_,_,X,_,X,_,X,_,_,X,_,_,_,_,X,_,_,X,_,_,_,_,],
  [_,X,_,X,_,X,_,X,_,X,_,_,X,_,X,_,_,X,_,X,_,_,_,_,X,_,_,X,_,_,_,_,],
  [_,_,X,_,_,_,X,_,_,X,X,X,X,_,X,_,_,X,_,X,X,X,X,_,X,X,X,_,_,_,_,_,],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,],
];

let span = [0, 210];

let evaluator = (pos, bitmap) => {
  // ok ok, 
  let pixelWidth = (span[1] - span[0]) / (bitmap[0].length - 1);
  // then we can count position across like, 
  let column = Math.ceil(pos / pixelWidth);
  // console.log(`for ${pos}, column is ${column}`);
  // map would be... one byte... 
  let mask = 0;
  for(let row = 0; row < bitmap.length; row ++){
    if(bitmap[row][column]){
      // thing is upside down, 
      // could swap firmware, idk 
      mask |= (1 << (7-row));
    }
  }
  return mask;
}

// for(let i = span[0]; i < span[1]; i += 5){
//   evaluator(i, bitmapHello);
// }

// let's do... dummy maxl w/ no devices 

let maxl = createMAXL({
  auxiliaryDevices: ["pixOutput"], 
  motionAxes: ["x", "y"],
  eventChannels: ["neopixelBitmap"],
  // subscriptions: [],
  subscriptions: [
    {
      actuator: "xMotor",
      track: "x", 
      reader: "stepper",
    },    
    {
      actuator: "ylMotor",
      track: "y", 
      reader: "stepper",
    },    
    {
      actuator: "yrMotor",
      track: "y", 
      reader: "stepper",
    }
  ],
});

// await maxl.addSegmentToQueue({
//   endPos: [0, 100], 
//   velocity: 250,
//   junction: 50,
//   eventObject: {
//     name: "neopixelBitmap",
//     val: 0,
//   }
// })

await maxl.begin();

await xMotor.setCurrentScale(0.25);
await ylMotor.setCurrentScale(0.75);
await yrMotor.setCurrentScale(0.75);

// go left-to-right with this evaluator authoring the event track... 
await maxl.addSegmentToQueue({
  endPos: [210, 0], 
  velocity: 250,
  junction: 50,
  eventObject: {
    name: "neopixelBitmap",
    evaluationPrecision: 10,  // in milliseconds 
    sendy: true,
    evaluationFunction: (states) => {
      let xpos = states.unitX * states.dist + states.p1[0];
      return evaluator(xpos, bitmapHello)
    }
  }
})

let yShift = -210

await maxl.addSegmentToQueue({
  endPos: [0, yShift], 
  velocity: 250,
  junction: 50,
  // eventObject: {
  //   name: "neopixelBitmap",
  //   evaluationPrecision: 10,  // in milliseconds 
  //   sendy: true,
  //   evaluationFunction: (states) => {
  //     let xpos = states.unitX * states.dist + states.p1[0];
  //     return evaluator(xpos, bitmapHello)
  //   }
  // }
})

await maxl.addSegmentToQueue({
  endPos: [210, yShift], 
  velocity: 250,
  junction: 50,
  eventObject: {
    name: "neopixelBitmap",
    evaluationPrecision: 10,  // in milliseconds 
    sendy: true,
    evaluationFunction: (states) => {
      let xpos = states.unitX * states.dist + states.p1[0];
      return evaluator(xpos, bitmapWorld)
    }
  }
})