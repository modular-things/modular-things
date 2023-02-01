/*
diff.js

js object diffing utes

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

let settingsDiff = (a, b, name) => {
  for(let ka in a){ // for key of a in a,
    let match = false 
    for(let kb in b){ // for key of b in b,
      if(ka == kb){   // if we have matching keys, OK 
        match = true 
      }
    }
    if(!match) throw new Error(`key '${ka}' in ${name} has no match in provided settings`)
  }
}

export {
  settingsDiff
}