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

This workshop will introduce participants to modular-things: a new framework we have developed that allows users to quickly build hardware projects. Using a set of dedicated input and output devices, new systems can be programmed from a high level environment in the browser. Each device presents its own API as soon as it's plugged in, so users can focus on using modules for their project instead of puzzling over how to wire them together. In the workshop, we want to help participants collectively build whimsical music machines using the framework, combining input devices (knobs, buttons, time-of-flight sensors) with outputs (solenoids, steppers, transducers) in new and playful ways. Participants can additionally learn how to turn their Arduino projects into new modules.

### Description (500 words max)

"modular-things" is a system that makes the development of physical computing systems interactive, extensible, and modular. We want to make working with hardware kits more like working with software libraries. The current process for programming microcontrollers involves recompiling and flashing firmware upon any change to software or hardware systems due to the tight coupling of the code which runs on an MCU and the peripherals plugged into that device. Our system uses single-function circuits that are made discoverable using a lightweight message-passing layer called OSAP (Open Systems Assembly Protocol) and that automatically present themselves to systems programmers with semantically meaningful APIs.

The "modular-things" project includes a set of dedicated circuit boards for an array of canonical input and output devices (time-of-flight sensors, potentiometers, accelerometers, solenoids, stepper motors, servos, etc). When these devices are plugged into a computer they present a unique identifier (a human-readable and editable name) and a description of what functionality they have. In the modular-things IDE, users are then presented with a list of discovered objects, along with their APIs. Consequently users don't even have to read any documentation to get started, they simply plug devices into their computer, and start calling functions. 

User can then write programs in a high level language that integrates the collection of boards into a single system. If the user wants to add a new input or output, all they have to do is plug in another board: they can even do this while their existing system is running. Additionally, the IDE allows users to create a graphical interface in HTML/CSS/JavaScript for operating the physical device they made.

While we provide a core set of modular-things, and will bring a large kit of them to the workshop, it is also easy to make any existing Arduino project into a new modular-thing. Folks can quickly add onto their projects by first modular-izing their own contribution and then using the modular-things framework to combine it with others' open source work! Since thing-APIs are presented automatically, the modular-things framework makes it possible to use others' contributions without reading any documentation, looking at any pinouts, or compiling any new code! 

We have also developed a set of mechanical machine building components that make it easy to create composable motion axes; modular-things supports sychronized stepper motor control for multi-degree of freedom machines.

During our workshop we will present the modular-things system by building with it. Participants will collaborate to build whimsical music machines using modular-things input/output devices and our construction kit of machine building components. We'll be able to assemble the mechanical and electrical hardware for these machines, program them in the modular-things IDE, and create web interfaces to control them. Participants will be invited to take their projects home to integrate with their own work, and we expect to be able to support ten to twenty individuals, maybe more if we split folks up into groups. 

### Photographs

### Video 