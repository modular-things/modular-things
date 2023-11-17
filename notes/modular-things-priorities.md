We've been around about these things a few times, IIRC the priorities list is something like this:

## 1. It should be easier to make new things;

Including "things" into a system is the biggest bottleneck, and motivator: we want others to be able to add their work to the system easily. 

At the moment, firmwares are pretty awkward to write. We should be able to write "mostly stand-alone" firmwares, that are then easily "tagged" for use in broader systems with some single-liners, rather than writing these serializer interfaces on either side. 

In python, this is probably some kind of function decorator;

```
@modular_rpc
define blink_led(state):
	pin.on()
```

I'm not entirely sure how we would do this with JavaScript codes to be honest, but we did have a prototype to use templates in embedded CPP;

```cpp
// singular args, singular return:
float singleThingFunc(uint16_t arg){
  return 0.22F;
}

// one-line wrapper, 
Modular_RPC<float, uint16_t> rpcOne(&osap, "singleThingFunc", singleThingFunc);

// list args, list return:
Array<uint16_t, 10> multipleThingsFunc(Array<boolean, 2> arg){
  Array<uint16_t, 10> ret;
  ret.val[1] = 11;
  ret.val[2] = 12;
  return ret;
}

Modular_RPC<Array<uint16_t, 10>, Array<boolean, 2>> rpcTwo(&osap, "multipleThingsFunc", multipleThingsFunc);
```

The C was a little bit awkward (I am still learning template-programming), but it got us going in the write direction. 

### 1.1. This requires consistent type serialization!

I maintain that i.e. CBOR, CAPNProto, or MSGPack (or something-like-this) will be our saviour on that front. 

We don't need a serialization code if we do the "micropython-bridge" thing. 

## 2. We should be able to "remove the PC"

This one's pretty obvious. Best candidate at the moment is i.e. micropython in a router-thingy... Maybe compiling our own build of micropython to be able to do the comms fast enough! 

## 3. Connecting things should be easier

This is ~ a networking problem: USBs are fine but at scale they seem buggy and (related to #2) are high latency (on account of the OS). 

So: busses, port-to-ports, mixtures, etc - we need good transport layer(s). 