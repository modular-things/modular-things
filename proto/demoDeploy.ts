// could look like... 
import Stepper from ""
import ModularThings from ""

// what do we expect to have here?
let xMotor: Stepper;
let yMotor: Stepper;
let zMotor: Stepper; 

// diff expectations w/ reality

try {
  await ModularThings.begin({
    things: [
      {
        xMotor,
        type: "Stepper",
      }, {
        yMotor,
        type: "Stepper"
      }
    ]
  })
} catch (err) {
  // print errors, 
}

// ... then our code here, 

// catch changes w/ 
ModularThings.onNewThing((youngest, things) => {

})
ModularThings.onDroppedThing((exiting, things) => {

})
// or the simpler, 
ModularThings.onChange((things) => {

})
