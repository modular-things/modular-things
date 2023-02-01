/*
cobs.js

consistent overhead byte stuffing, wikipedia implementation

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2020

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

function cobsEncode(buf) {
  var dest = [0];
  // vfpt starts @ 1,
  var code_ptr = 0;
  var code = 0x01;

  function finish(incllast) {
    dest[code_ptr] = code;
    code_ptr = dest.length;
    incllast !== false && dest.push(0x00);
    code = 0x01;
  }

  for (var i = 0; i < buf.length; i++) {
    if (buf[i] == 0) {
      finish();
    } else {
      dest.push(buf[i]);
      code += 1;
      if (code == 0xFF) {
        finish();
      }
    }
  }
  finish(false);

  // close w/ zero
  dest.push(0x00)

  return Uint8Array.from(dest);
}

// COBS decode, tailing zero, that was used to delineate this buffer,
// is assumed to already be chopped, thus the end is the end 

function cobsDecode(buf) {
  var dest = [];
  for (var i = 0; i < buf.length;) {
    var code = buf[i++];
    for (var j = 1; j < code; j++) {
      dest.push(buf[i++]);
    }
    if (code < 0xFF && i < buf.length) {
      dest.push(0);
    }
  }
  return Uint8Array.from(dest)
}

export default {
  encode: cobsEncode,
  decode: cobsDecode
}
