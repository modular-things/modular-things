## 2022 11 17 

per https://electronics.stackexchange.com/questions/192920/usb-device-latency it seems like we can ~ likely only do 1ms at the lower bound. That would even be pretty tite, but it means that any realtime loop between multiple endpoints is going to be pinned there, meaning, yes, we want an embedded bus - to nobody's surprise. 

however, I am curious to see how well we can do OTS motion systems with USB alone, for i.e. the maker squad, HTMAA, etc... this also (and maybe more importantly) wants to count sync-up as a metric. 

First the speed tests, I think, and then maybe I look at some improvements. 

### Ping Speed Tests

Given varying conditions and spans, how fast can we go there-and-back?

- we want to test for
  - ping via browser-to-devices 
  - ping from node to devices 
    - with increasing devices,
    - with hub & w/o hub 
    - windows, linux, firefox / chrome 
    - make a table 

This one is pretty simple, innit... noting that my machine has two USB ports, and we have a hub w/ 4 devices, so we can do a max of 8 endpoints eventually... I guess I'll do it... in arduino? I'll write the JS front-end first. 

### Ping Tests

These were calculated by running 250 pings sequentially, in groups: so i.e. with 7 devices, I would fire all 7 pings down simultaneously and then each reports its own time back up. Took the average of all events. 

| path | num. usb devices | avg ping w/o hub | avg ping w/ hub |
| --- | --- | --- | --- |
| WINDOWS | --- | --- | --- |
| browser -> node -> devices | 1 | 17.34 | 17.82 |
| browser -> node -> devices | 2 | 16.94 | 18.46 |
| browser -> node -> devices | 3 | N/A | x |
| browser -> node -> devices | 4 | N/A | x |
| browser -> node -> devices | 5 | N/A | x |
| browser -> node -> devices | 6 | N/A | x |
| browser -> node -> devices | 7 | N/A | x |
| node -> devices | 1 | 15.45 | 15.90 |
| LINUX | --- | --- | --- |
| browser -> node -> devices | 1 | NT | NT |
| browser -> node -> devices | 2 | NT | 6.654 |
| browser -> node -> devices | 3 | NT | 6.250 |
| browser -> node -> devices | 4 | NT | 5.183 | 
| browser -> node -> devices | 5 | NT | 5.417 |
| browser -> node -> devices | 6 | NT | 5.866 |
| browser -> node -> devices | 7 | NT | 6.310 |
| browser -> node -> devices (two hubs) | 7 | NT | 5.626 |

### Sync / Spread Tests

Given varying conditions etc, how well can we sync packet arrival, from a single source? 

These calculate how arrival time deviates. I.E. I stuff 7 packets to 7 devices into OSAP at the same time (as close as code-ly possible), to a SYNC endpoint in each of those devices. That endpoint is a counter: it is attached to a digital pin that can be driven high, but is in a listening state by default. If the packet arrives and the pin is still LO, it counts its "sync time" as 0 and drives the pin HI, otherwise it stores the time-since-it-sensed-the-pin-going-hi, i.e. how many us have passed since someone else rx'd a packet in that round. That sensing is done on an interrupt. 

The "average sync" then is the average delay between pin-hi and packet-arrival, not including the "0" recording device - the one that recorded the first packet. These were done in runs of 100 sync events being fired: the "best average" is the sync even with the... best average sync time, and the "worst avg" is the slowest. The *average* is the total average over *all devices, all events* - and the "worst single device" sync is, during all 100 tests, across all 7 devices, what was the absolute worst observed delta from first-packet-arrival to last-packet-arrival. 

| (windows) path | num. usb devices | avg sync (us) | best *avg* sync (us) | worst *avg* sync (us) | worst *single device* sync (us) | 
| --- | --- | --- | --- | --- | --- |
| WINDOWS | --- | --- | --- | --- | --- | --- | --- |
| browser -> node -> devices (no hub) | 2 | 193.73 | 0.00 | 1679.00 | 1679.00 |
| browser -> node -> devices (hub) | 2 | 220.48 | 0.00 | 2386.00 | 2386.00 |
| browser -> node -> devices | 3 | 305.15 | 0.00 | 3758.50 | 3850.00 |
| browser -> node -> devices | 4 | 419.17 | 17.33 | 1844.00 | 2728.00 |
| browser -> node -> devices | 5 | 568.66 | 80.75 | 2347.00 | 4676.00 |
| browser -> node -> devices | 6 | 578.82 | 44.00 | 1747.40 | 3481.00 |
| browser -> node -> devices | 7 | 722.02 | 162.17 | 2654.50 | 4235.00 |
| browser -> node -> devices (two hubs) | 7 | 829.17 | 102.83 | 3401.83 | 8112.00 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| node -> devices (no hub) | 2 | 210.72 | 0.00 | 2563.00 | 2563.00 |
| node -> devices (hub) | 2 | 218.28 | 0.00 | 1935.00 | 1935.00 |
| node -> devices | 3 | 343.06 | 1.50 | 3612.50 | 6996.00 |
| node -> devices | 4 | 431.91 | 2.67 | 2478.33 | 3651.00 |
| node -> devices | 5 | 517.24 | 73.50 | 2362.50 | 4653.00 |
| node -> devices | 6 | 557.27 | 17.20 | 1803.00 | 3503.00 |
| node -> devices (two hubs) | 7 | 736.73 | 178.83 | 3657.67 | 8179.00 |
| LINUX | --- | --- | --- | --- | --- | --- | --- |
| browser -> node -> devices (no hub) | 2 | 69.47 | 0.00 | 1129.00 | 1129.00 |
| browser -> node -> devices (hub) | 2 | 63.91 | 0.00 | 1150.00 | 1150.00 |
| browser -> node -> devices | 3 | 138.87 | 2.50 | 1314.00 | 2415.00 |
| browser -> node -> devices | 4 | 177.93 | 0.00 | 1991.33 | 3001.00 |
| browser -> node -> devices | 5 | 128.06 | 11.00 | 1178.00 | 1267.00 |
| browser -> node -> devices | 6 | 197.19 | 18.60 | 1229.00 | 3349.00 |
| browser -> node -> devices | 7 | 329.08 | 34.67 | 1993.17 | 2851.00 |
| browser -> node -> devices (two hubs) | 7 | 188.31 | 10.00 | 1263.33 | 3024.00 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| node -> devices (no hub) | 2 | 81.25 | 0.00 | 263.00 | 263.00 |
| node -> devices (hub) | 2 | 65.99 | 0.00 | 606.00 | 606.00 |

OK I have this... browser-based test now, so I'll re-roll for node-side, then get onto the linux machine. 

And likewise would permutate for `node -> devices` !! IMPORTANTLY haha, don't miss that part. 

### Conclusions

(1) it looks like the `browser->node` link is *not* the majority of the loss, which is rad. 

### Improvements 

I'm not sure yet how well the sync will work, but am curious to see what local improvements might look like... perhaps a no-gc-required vertex-pass-by-pointer `jscripto` code helps, and perhaps a `vbroadcast` transport layer packet type does also: though that, trickily, requires that we loosen up a few stack slots at once: or maybe not, since we can pass the same pointer to multiple ports, presuming that they will be well behaved and won't modify the thing, holy shit. 

Also, in JS etc we should *create and destroy* stack items, rather than allocating from a fixed heap, non? Also considering that we have only to write the virtual broadcast in JS (can just reject the key in tiny-osap), the only modification is to pass by pointer, which, since the JS is uggo in that regard anyways (making system calls to allocate typedArrays in all likelihood), is the improvement we want. 

## 2022 11 20 

I'm filling in the tables above, today, and have just gotten through to the really actually-important test: the sync up. I'm right now just looking at it on a scope, and it looks as though most of these are within 1ms, though some go longer. The basics there are pretty promising then, but I don't either have a way to measure this. To do that... I would need a more sophisticated little script (in embedded), to get the timing across test articles. 

I think that would be like... each has a pin that it can write to *or* read from, then a state machine... when it rx'es the message, the sync pin has either *been* pulled high, in which case we record a time-since-high, or *has not been* pulled high, in which case it marks itself as "FIRST" (or offset = 0) and drives the pin high. Then we scan, collect, and ensure that there aren't two that think they're first... 

Overall though the < 1ms sync is promising, and this is still in windows, so linux maybe even better? So hopefully be end-of-night I have more devices to test, and a little scripto to test-and-gather results with a breadboard-sync'd group. 

... this is a little awkward but it's running, though it might be that the interrupt isn't firing. OK, I've the mystery on the scope... 

IDK if this is electrical... nah, the interrupt is causing arduino to hang for some reason. 

I need tickers on these things... can't tell if they're hanging or if the ports are misbehaving. 

I maybe should not rely on the query to do the resetting... should instead do a hard reset, non? 

I did a hard reset, then just reset twice, that seems to work, IDK - I guess better would just be a timed reset or something, I'm too braindead atm to unfk it properly. 

## 2022 11 21 

IDK what's up but I am now seeing values that are basically not reset, but I'm wondering if I can do this whole thing without the sync pin... just querying time-of-arrival across the board, getting a series of those, then reasoning clocks are enough the same to not drift? I would have to do a little bit of drift math etc, I could instead just look at this shit on a scope and call it a day. 

Thing just needs a pull-down, electrically. I'll try to whip it with software... 