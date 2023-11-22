/*

maxl-accelerometer.ts

motion control input device 

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2023

*/

import { osap } from "../../osapjs/osap";
import Serializers from "../../osapjs/utils/serializers";

export default function maxlAccelerometer(name: string, pipes: Array<any>) {
  // hurm hurm, we should sub to pipes here, then mirror that out ? 
  
  // console.warn(`startup w/ pipes`, pipes[0].name)
  return {
    on: (channel: string, func) => {
      for(let pipe of pipes){
        console.log(`pipe...`, pipe)
        if(pipe.name == channel){
          console.warn(`subd' ${pipe.name} to ${channel}`);
          pipe.subscribe(func);
        }
      }
    },
    updateName: (newName: string) => {
      name = newName;
    },
    getName: () => { return name },
    api: [],
  }
}