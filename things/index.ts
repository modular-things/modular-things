// import rgbb from "./rgbb/rgbb.js";
// import capacitive from "./capacitive/capacitive.js"
// import timeOfFlight from "./timeOfFlight/timeOfFlight";
import mosfet from "./mosfet-xiao/software/mosfet";
import accelerometer from "./accel-bno085-xiao/software/accelerometer";
// import oled from "./oled/oled";
// import potentiometer from "./potentiometer/potentiometer";
import servo from "./servo-xiao/software/servo";
import stepper from "./stepper-hbridge-xiao/software/stepper";                                  // the uncomplicated stepper 
// import maxlStepper from "./maxlStepper/maxlStepper";                      // maxl stepper
// import haxidrawController from "./haxidrawController/haxidrawController";
// import maxlAccelerometer from "./virtualThings/maxl-accelerometer";    // as below 
// import neopixelThing from "./virtualThings/maxl/neopixelThing";        // historical / from MAXL demos 
// import bedHeater from "./virtualThings/bedHeater";
// import hotend from "./virtualThings/hotend"

export default {
  stepper,                // ?? bad shape 
  mosfet,
  accelerometer,
  servo,
  // rgbb,                   // looks ok 
  // maxlStepper,
  // capacitive,
  // timeOfFlight,
  // oled,
  // potentiometer,
  // maxlAccelerometer,   // in /archival 
  // neopixelThing,       // in /archival 
  // bedHeater,
  // hotend, 
  // haxidrawController
};
