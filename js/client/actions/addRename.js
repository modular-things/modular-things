export async function addRename(thing, osap) {
  thing.rename = async (name) => {
    try {
      await osap.mvc.renameVertex(thing.vt.route, name)
    } catch (err) {
      console.error(err)
    }
  }
} 