## 2022 11 21 

### Modular-Thing Motion Systems 

I think that for this example, each motor should be 1DOF, since we can / will directly address each... and we can do basics:

- each has abs. maximum acceleration and rate, 
- each has a state machine... w/ velocity or position targets, 
- we have two "moves"
  - goto posn w/ <accel>, <vf>, <vi>
  - goto velocity w/ <accel> 
  - in either, we can leave off args at the tail (shorter length packets)
    - in which case i.e. accel uses abs-max, and (vf, vi) go to (zero, current)
- we have *one* "query-ables"
  - motion state: position, velocity, acceleration 
  - if we're moving, vel != 0, that's .awaitMotionEnd() 
- we can set some things:
  - set abs. maximums 
  - set current position 

This seems to me like the minimum viable, on top of which everything else can be written... and homing, etc, we'll do with external switches. 

### 2022 11 22

I think I should start with outfitting a little integrator, using above states, and get it into a QTPY, w/o an interrupt to start, to look at floating-point calculation times. Also needs some basis in the axl codes, i.e. I need to look at them. 

Hmm... OK floating point ops don't look too eggregious yet, though I've just a few multiplications. I am seeing a deal of clock drift though, so I will want to check in on that front as well... and might end up wanting some kind of time-sync algo ?? 

I'm getting a sense that this might actually work, though am a little confused as to how - I think I might check in on clock drift now, ahead of finishing the full blown state machine, since it's not unlikely that error there could pooch the whole situation. 

Clock sync actually looks OK, god bless. 

So, now I want a full on state machine in here, and to outfit it, then demo with... a step / dir pin set on the scope (first, just going to a pre-set position), then w/ a virtual machine - since i.e. we are going to live in straight one-step-per-unit land down under, yeah? 

OK, it's apparently working an instrumented, but needs hardware output (probably next), then a VM, and interrupts. 

I'll actually swap on now to see that I can get the hardware working: so a coupla debug-outs here, then PWM waveforms and hopefully sinusoids on the other side... I'll be copy-pasta from the fab-step project most likely. 

This works now as well, thing still isn't on an interrupt though, I suppose that would be next: then the vm / etc. 

