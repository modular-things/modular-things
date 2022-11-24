// lol, this adds the function "setUniqueName" 
// to the virtual thing, 
export async function addSetName(thing, osap) {
  thing.setName = async (name) => {
    try {
      // add back that "rt_" which designates the vertex as a root... 
      const newName = `rt_${thing.firmwareName}_${name}`;
      console.log(newName);
      await osap.mvc.renameVertex(thing.vt.route, newName)
    } catch (err) {
      console.error(err)
    }
  }
} 