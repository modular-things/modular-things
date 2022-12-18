# modular-things 

`plug and play w/ virtualized hardware`

## What it Is 

modular-thing uses ~ virtualization ~ to make it easier to write programs that run across multiple hardware devices. 

Devices auto-enumerate on USB ports[^1], and are wrapped in "virtual-things" - basically, software mirrors for firmwares - and those virtual things are used to program systems. 

https://user-images.githubusercontent.com/3912931/208218533-4f560322-4c1f-4b66-8764-bb6632fe6b44.mp4

At the moment, we have a [series of **circuits** that we have built custom for this project](https://github.com/modular-things/modular-things-circuits), but any Arduino-based firmware can be expressed as a modular-thing, so adding new ones is not difficult. We are developing some [examples](js/examples)... 

It is also possible to build small UIs in the modular-things IDE, mixing webpage code directly with machine-controller code.

https://user-images.githubusercontent.com/3912931/208218526-1f176558-08ec-48f6-a232-80a7c65dabd2.mp4

We've used the system to successfully build systems of medium complexity, like a xylophone that plays itself;

https://user-images.githubusercontent.com/3912931/208218497-fbc46cd1-46c9-4727-bb22-3730d9768665.mp4

And we've used it in an educational context, where [HTMAA](https://fab.cba.mit.edu/classes/863.22/) student groups used it as a machine-building framework.

https://user-images.githubusercontent.com/3912931/208218519-a38d10d7-ebe8-494f-a381-eab1c3aec8d2.mp4

--- 

modular-thing is written by [Quentin Bolsee](https://github.com/qbolsee), [Leo McElroy](https://github.com/leomcelroy) and [Jake Read](https://github.com/jakeread) based on ongoing work at the [MIT Center for Bits and Atoms](https://cba.mit.edu/) and [Hack Club](https://hackclub.com/). It is based on the [surprising performance of modern USB](log/2022-11_usb-motion-perf-tests-log.md), an insight that we picked up from the [urumbu project](https://gitlab.cba.mit.edu/neilg/urumbu) ([paper](https://cba.mit.edu/docs/papers/22.11.Urumbu.pdf)). Under the hood, it uses [osap](http://osap.tools/) to route packets and serialize data. Also inspired by the [virtual-machine](https://cba.mit.edu/docs/theses/16.08.Peek.pdf) architecture pioneered by [Nadya Peek](http://infosyncratic.nl/) and [Ilan Moyer](https://web.mit.edu/imoyer/www/index.html), way back in the way back. 

---

## [Modular-Thing Circuits](https://github.com/modular-things/modular-things-circuits)

--- 

# Usage 

## Install 

**(1) install [node.js](https://nodejs.org/en/) - please use version 16.15.1 or above**

**(2) clone this repo**

**(3) navigate to `<this-repo>/js` and do `npm install` in the terminal**

## Run 

**(1) from `<this-repo>/js` do `npm run start`**

**(2) navigate (in the browser) to http://localhost:8080/client/**

--- 

# Writing New modular-things 

For embedded (arduino) codes, install the OSAP library, which you can download as a zip here: https://github.com/jakeread/osap-arduino, and should also be available via arduino's library manager.

Also, install the `FlashStorage_SAMD` library, via the library manager.

We use the [ArduinoCore-fab-sam](https://github.com/qbolsee/ArduinoCore-fab-sam) for [these circuits](https://github.com/modular-things/modular-things-circuits), which you can install into Arduino via the notes in that repo.

## Brief Notes on Writing "virtual things" 

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

--- 

# Footnotes

[^1]: We use USB at the moment, but [osap](http://osap.tools/), the routing layer, supports discovery across arbitrary links, and so we plan to include some kind of realtime-ish bus in future circuits, for deeper and more scalable networks of modular-things. 
