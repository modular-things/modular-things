// opapjs/utils/newSerializers.ts
// write and read data types from packets
// started fresh to match template_serializers.h
// used in autoRPC codes, !nowhere else!
// TODO is delete the other and mainline this 
// call it 'serdes' ? 

let stringEncoder = new TextEncoder();
let stringDecoder = new TextDecoder();

let keys = {
  void: 0,
  int: 1,
  bool: 2,
  float: 3,
  string: 4,
}

// returns the increment 
// write.type = (value: type, dest: Uint8Array, offset: number): number{}
let write = {
  int: function (value: number, dest: Uint8Array, offset: number): number {
    if (value > (2 ** 31 - 1) || value < (- 1 * 2 ** 31 + 1)) throw new Error(`val of ${value} written to Int32 width`);
    let tempArr = Int32Array.from([value]);
    let tempBytes = new Uint8Array(tempArr.buffer);
    dest.set(tempBytes, offset);
    return 4;
  },
  bool: function (value: boolean, dest: Uint8Array, offset: number): number {
    value ? dest[offset] = 1 : dest[offset] = 0;
    return 1;
  },
  float: function (value: number, dest: Uint8Array, offset: number): number {
    let tempArr = Float32Array.from([value]);
    let tempBytes = new Uint8Array(tempArr.buffer);
    dest.set(tempBytes, offset);
    return 4;
  },
  string: function (value: string, dest: Uint8Array, offset: number): number {
    let stringStream = stringEncoder.encode(value);
    dest[offset] = keys.string;
    dest[offset + 1] = stringStream.length;
    dest.set(stringStream, offset + 2);
    return stringStream.length + 2;
  }
}

// read.type = (source: Uint8Array, offset: number):type{}
let read = {
  string: function (source: Uint8Array, offset: number): string {
    if (source[offset] != keys.string) throw new Error("bad typekey match while deserializing a string");
    let length = source[offset + 1];
    return stringDecoder.decode(source.subarray(offset + 2, offset + 2 + length));
  },
  int: function (source: Uint8Array, offset: number): number {
    return new Int32Array(source.slice(offset, offset + 4).buffer)[0];
  },
  bool: function (source: Uint8Array, offset: number): boolean {
    return (source[offset] > 0);
  },
  float: function (source: Uint8Array, offset: number): number {
    return new Float32Array(source.slice(offset, offset + 4).buffer)[0];
  },
  void: function (source: Uint8Array, offset: number): number {
    return 0;
  }
}

export default {
  write,
  read,
  keys
}