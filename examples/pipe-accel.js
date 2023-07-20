import Serializers from "../src/lib/osapjs/utils/serializers";

accel.on("linearAcceleration", (data) => {
  // console.warn(`got data here`, data);
  // let rptr = 0;
  let obj = {
    time: Serializers.readUint32(data, 0),
    x: Serializers.readFloat32(data, 4),
    y: Serializers.readFloat32(data, 8),
    z: Serializers.readFloat32(data, 12),
  }
  console.log(obj.x.toFixed(3))
  // console.log(data[0], data[1], data[2], data[3])
})