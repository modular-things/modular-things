// lately I have been thinking it could be simpler, 
// we do... 

// pick any given modular-thing: 
import Stepper from ""

// 'new'-ing it instantiates the mt instance, 
// goes looking for the particular thing, etc ?
// but it aught to be:

let xMotor = await new Stepper("name");

// ... then these could still pop into / out-of existence, 
// each could have i.e. 

xMotor.isAvailable(); 

// and doing i.e. this w/o the await:
xMotor = new Stepper("name");

// would return 
xMotor.isAvailable() == false;

// until it appears... 

// then in i.e. stepper.ts we would do 

import { mt, Thing } from 'modular-things'

export default class Stepper extends Thing {
  // ?? 
}