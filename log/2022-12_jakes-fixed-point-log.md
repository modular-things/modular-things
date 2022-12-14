## 2022 12 14 

OK today I'm trying to whip the integrator up to use fixed point maths... and bring the integrator rate way up, I think as a baseline the current integrator runs in ~ 100us, or something? I run the integrator on a 250us period, so hopefully we can crank that to a ~ 50us integrator period, with 5us integration step or less. 

---

## Perf Goals

- from 50us integration step, 250us integration period 
  - to 5us step, 50us period 