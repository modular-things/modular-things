#ifndef PID_HEATER_CONFIG_H_
#define PID_HEATER_CONFIG_H_

#define THERM_LOOP_MILLISECONDS 10

// this should function as all-the-config-we-need to match thermistors... 
// see i.e. https://www.tme.eu/Document/f9d2f5e38227fc1c7d979e546ff51768/NTCM-100K-B3950.pdf 
// or search "NTC 100K 3950 Table"

#define THERM_ABS_MAX_TEMP  300.0F
#define THERM_R1_VAL        1000.0F   // in the voltage divider, what's the top resistor's val, ohms ? 
#define THERM_VIN_VAL       3.3F      // voltage applied to top of thermistor-divider ?
#define THERM_ADC_RANGE     4096      // num. ticks in the ADC ?
#define THERM_PWM_RANGE     4096      // num. ticks in the pwm output 
#define THERM_PWM_FREQ      20000     // pwm frequency (slo in the bed, fast in a hotend)

#define THERM_TABLE_LEN   54

float thermTable[THERM_TABLE_LEN][2] = {
  {0.0F,      354600.0F}, // {degs C, ohms}
  {10.0F,     208800.0F},
  {20.0F,     126900.0F},
  {25.0F,     100000.0F},
  {30.0F,     79330.0F},
  {40.0F,     50900.0F},
  {50.0F,     33450.0F},
  {60.0F,     22480.0F},
  {70.0F,     15430.0F},
  {80.0F,     10800.0F},
  {90.0F,     7690.0F},
  {95.0F,     6530.0F},
  {100.0F,    5569.0F},
  {105.0F,    4767.0F},
  {110.0F,    4097.0F},
  {115.0F,    3533.0F},
  {120.0F,    3058.0F},
  {125.0F,    2655.0F},
  {130.0F,    2313.0F},
  {135.0F,    2020.0F},
  {140.0F,    1770.0F},
  {145.0F,    1556.0F},
  {150.0F,    1371.0F},
  {155.0F,    1212.0F},
  {160.0F,    1074.0F},
  {165.0F,    954.4F},
  {170.0F,    850.1F},
  {175.0F,    759.0F},
  {180.0F,    679.3F},
  {185.0F,    609.2F},
  {190.0F,    547.6F},
  {195.0F,    493.2F},
  {200.0F,    445.2F},
  {205.0F,    402.7F},
  {210.0F,    365.0F},
  {215.0F,    331.4F},
  {220.0F,    301.6F},
  {225.0F,    274.9F},
  {230.0F,    251.0F},
  {235.0F,    229.6F},
  {240.0F,    210.4F},
  {245.0F,    193.1F},
  {250.0F,    177.5F},
  {255.0F,    163.4F},
  {260.0F,    150.7F},
  {265.0F,    139.1F},
  {270.0F,    128.7F},
  {275.0F,    119.1F},
  {280.0F,    110.5F},
  {285.0F,    102.6F},
  {290.0F,    95.39F},
  {295.0F,    88.81F},
  {300.0F,    82.78F},
  {310.0F,    82.00F},  // big spike to avoid overshoots if no other guards 
};

#endif 