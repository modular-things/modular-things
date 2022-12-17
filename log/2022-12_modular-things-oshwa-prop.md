## OSHWA Workshop Proposal 

Ok we have

- title 
- summary (150 words)
- keywords (3 identifying terms)
- description (500 words)
- photographs (max 2)
- video (one) 

I think the video is probably the most key; we want to show:

- modular-thing can lower the barrier to hardware entry, 
  - it's the zero-docs approach to sharing an OSHW module 
- and can make it easier to use multiple projects in one meta-project,
- and interface between tiny UIs / applications, and hardware
- and *of course* we can make just about any device into a modular-thing, by virtualizing it! 
- we can even make medium-complex projects, like machines 
- like xylophones... 

### Title

- modular-things: a new, playful way to build microcontroller projects
- modular-things: plug-and-play with virtualized hardware 

### Summary (150 words)

This workshop will introduce participants to modular-things: a new framework we have developed that allows users to quickly build hardware projects. Using a set of dedicated input and output devices, new systems can be programmed from a high level environment in the browser; each device presents its own API as soon as it's plugged in, so users can focus on using modules for their project instead of puzzling over how to wire them together. In the workshop, we want to help participants collectively build whimsical music machines using the framework, combining input devices (knobs, buttons, time-of-flight sensors) with outputs (solenoids, steppers, transducers) in new and playful ways. Participants can additionally learn how to turn their Arduino projects into new modules.

### Description (500 words max)

"modular-things" is a system for making the development of physical computing systems interactive, extensible, and modular; we want to make working with hardware kits more like working with software libraries. The current process for programming microcontrollers involves recompiling and flashing firmware upon any change to software or hardware systems due to the tight coupling of the code which runs on an MCU and the peripherals plugged into that device; modular-things are virtualized, single-function circuits that are made automatically discoverable using a lightweight message-passing layer called OSAP, meaning that the self-announce when plugged in to a host computer, and automatically present themselves with semantically meaningful APIs to systems programmers.

The "modular-things" project includes a set of dedicated circuit boards for an array of canonical input and output devices (time-of-flight sensors, potentiometers, accelerometers, solenoids, stepper motors, servos, etc). When these devices are plugged into a computer they present a unique identifier and a description of what functionality they have: a list of discovered objects, along with their APIs, is displayed in the modular-things IDE. This means that folks don't even have to read any documentation to get started, they simply plug devices into their computer! 

User can then write programs in a high level language such as JavaScript that integrates the collection of boards into a single system. If the user wants to add a new input or output, all they have to do is plug in another board. Additionally from the host computer the user can create a graphical interface in HTML/CSS/JavaScript for interacting with the physical device they made.

It is also easy to make any existing arduino project into a new modular-things, so folks can quickly add onto existing projects by first modular-izing their own contribution, and using the modular-things framework to combine it with others' open source contributions!

We have also developed a set of mechanical machine building components that make it easy to create composable motion axes; modular-things supports sychronized stepper motor control for multi-degree of freedom machines.

During our workshop we will present the modular-things system by building with it. We will build whimsical music machines using modular-things input- and output-devices, and our construction kit of machine building components. We'll be able to assemble the mechanical and electrical hardware for these machines, program them in the modular-things IDE, and create web interfaces to control them. Participants will be able to work together, or build their own machines, and take their creations home. 

### Photographs

### Video 