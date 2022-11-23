## Plug-and-Pop

To run

```
npm run start
```

For embedded (arduino) codes, put https://github.com/jakeread/osap-arduino (main branch) into `C:\Users\<username>\AppData\Local\Arduino15\libraries\` or wherever your arduino libraries live. 

[circuits here](https://github.com/jakeread/modular-thing-circuits) 

## Writing VMs

- name your firmware with `OSAP osap("stepper");` i.e. 
- add `stepper.js` in `thisRepo/js/virtualThings`
- add i.e. `import stepper from "../virtualThings/stepper.js";` at the head of `thisRepo/js/client/modularThingClient.js`
- add the constructor i.e. `stepper` to `let constructors = { rgbb, stepper }` at line 48 of the same file above 

That should be it, it'll show up etc. 

### Finding Endpoints 

I'm using indices here, to route to endpoints. 

```js
// the "vt.route" goes to our partner's "root vertex" - but we 
// want to address relative siblings, so I use this utility:
let routeToFirmware = PK.VC2VMRoute(vt.route)
// here we basically write a "mirror" endpoint for each downstream thing, 
// -------------------------------------------- 1: target data 
// now I can index to the 1st endpoint (I know it's this one because 
// I wrote the firmware!) just by adding a .sib() to that route;
let targetDataEndpoint = osap.endpoint(`targetDataMirror_${name}`)
targetDataEndpoint.addRoute(PK.route(routeToFirmware).sib(1).end())
```

Then I can write to those with 

```js
targetDataEndpoint.write(<data>, "acked")
```

But that all need to be serialized up front, i.e. 

```js
let datagram = new Uint8Array(13)
let wptr = 0
datagram[wptr++] = 0 // MOTION_MODE_POS 
// write pos, vel, accel *every time* and convert-w-spu on the way out, 
wptr += TS.write("float32", pos * spu, datagram, wptr)  // write posn
wptr += TS.write("float32", vel * spu, datagram, wptr)  // write max-vel-during
wptr += TS.write("float32", accel * spu, datagram, wptr)  // write max-accel-during
// and we can shippity ship it, 
await targetDataEndpoint.write(datagram, "acked")
```

In most cases I just dead-reckon the size of the datagram. Then TS.write will write most data types - and there are reciprocals in embedded. 