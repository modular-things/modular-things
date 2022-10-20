## 2022 10 19 

OK, spinning up some kind of thing for this now. AFAIK I can ~ more or less use the standing OSAP bottom-end. I have a few clear tasks to begin:

- osape / osape-arduino stubs into an arduino project for this board of quentin's design 
- js auto-opening pipe, 

Then a few less clear tasks:

- do we plumb things -> up, so we use "efficient" data transfer ? 
- wrap up a "virtual thing" class, and which methods are exposed ?
- that's it, right ? give leo some handlers 

## The Toolchains Trouble

- can build a new fab-core that uses g7
- and use an arduino library 

OK I ended up... porting OSAP as a library, wasn't that bad. Should be in a better mood more often. Onwards then... 

## JS Auto-Open 

This I've done before... setup most of the guts, next is the actual check-and-swap loop / runtimes ? 

## 2022 10 20 

OK, I'm actually using OSAP sweep-stuff for most of this, then will probably trigger re-scans with an aux websocket pipe (?) or something, I can even tx that w/ osap, etc. 

```js
let rescan = async () => {
  try {
    let graph = await osap.nr.sweep()
    let usbBridge = await osap.nr.find("rt_local-usb-bridge", graph)
    // console.log(usbBridge)
    for(let ch of usbBridge.children){
      // ignore pipe up to us, 
      if(ch.name.includes("wss")) continue
      // peep across usb ports, 
      if(ch.reciprocal){
        if(ch.reciprocal.type == "unreachable"){
          console.warn(`${ch.name}'s partner is unreachable...`)
        } else {
          console.log(`found a... ${ch.reciprocal.parent.name} module`)
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
}

setTimeout(rescan, 1500)
```

next would do...

- match & deliver JS object, 
- trigger on new-port signals 