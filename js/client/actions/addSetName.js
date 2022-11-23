// lol, this adds the function "setUniqueName" 
// to the virtual thing, 
export async function addSetName(thing, osap) {
  thing.setName = async (name) => {
    try {
      // add back that "rt_" which designates the vertex as a root... 
      await osap.mvc.renameVertex(thing.vt.route, "rt_" + name)
    } catch (err) {
      console.error(err)
    }
  }
} 