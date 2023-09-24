import rgbb from "./rgbb/rgbb.js";
import capacitive from "./capacitive/capacitive.js"
import timeOfFlight from "./timeOfFlight/timeOfFlight";
import mosfet from "./mosfet/mosfet";
import accelerometer from "./accelerometer/accelerometer";
import oled from "./oled/oled";
import potentiometer from "./potentiometer/potentiometer";
import servo from "./servo/servo";
import stepper from "./stepper/stepper";                                  // the uncomplicated stepper 
import maxlStepper from "./maxlStepper/maxlStepper";                      // maxl stepper
import haxidrawController from "./haxidrawController/haxidrawController";
// import maxlAccelerometer from "./virtualThings/maxl-accelerometer";    // as below 
// import neopixelThing from "./virtualThings/maxl/neopixelThing";        // historical / from MAXL demos 
// import bedHeater from "./virtualThings/bedHeater";
// import hotend from "./virtualThings/hotend"

export default {
  rgbb,                   // looks ok 
  stepper,                // ?? bad shape 
  maxlStepper,
  capacitive,
  timeOfFlight,
  mosfet,
  oled,
  accelerometer,
  potentiometer,
  servo,
  // maxlAccelerometer,   // in /archival 
  // neopixelThing,       // in /archival 
  // bedHeater,
  // hotend, 
  haxidrawController
};
