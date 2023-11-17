this notion about having each "thing" possibly standalone, i.e. w/

```javascript 
let device = await new Device();
```

is potentially real-big; makes the system really simple bootstrapping-wise... brings folks in at the ground layer w/ no complexity. could be very slick. 

… can we do 

```js
let instance = await new Thing(“addr”); 
```

that’d be tite - the addressing step is implicit, odd, but then just the thing can import mt … 

this would be the ideal way to do software-based systems, I think. starts at qty one, can pipe it into notebooks, etc. 