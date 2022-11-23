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

did that ! 

From Leo: I downgraded the naming system with random unique IDs which presents some clear irritations when the ports randomly resweep and your code no longer works. I think storing names in EEPROM would be hugely advantagous. I added some UI for writing names to devices but we still need the guts of it.

## 2022 11 23

OK I have a motor now and should get back to building its VM... I want also to check again the general state of the modular-system thing, OSAP, and the naming-to-eeprom code... I think I might do it with the RGBBThing, to clear that up first? 

Ah! Yes - I had this in a certified half-baked state: we can rename things, but need a second name to find the proper vm's for them: so each needs a fixed root-vertex name, for the firmware, then a unique-name that's re-writable. 

Also I have this bug

### String Reading / Writing Bug

I think here it's that

- strings written in JS and in CPP are successfully read-back by JS, 
- strings written in JS are not ever read in CPP, 
- additionally, here we use c-strings, 

This means that... likely, the issue is on the ingestion side - i.e. the data is all there when it's written, but i.e. CPP goes looking for a null-termination, but the way I write strings doesn't terminate 'em as such at the moment (badness), so we have this debacle. 

OK, amended that.

### Two-Names 

OK, now we need to stash a firmware-name alongside a unique-root-name... and then report both? 

Yeah I guess I can basically concatenate to `rt_firmwareName_uniqueName`and then disambiguate w/ the `rt_[...]_[...]` delineation, that would be a kind of minimum-surgery, but a little awkward down the line. 

I actually won't have to change any embedded code for that change... 

--- 

## Dev List

- the "rename" button shouldn't allow users to rename the `firmwareName` section of the names... 
  - it's also straight up not done 

## Demo Wishlist 

- touchpad-to-streaming-position drawing robot 