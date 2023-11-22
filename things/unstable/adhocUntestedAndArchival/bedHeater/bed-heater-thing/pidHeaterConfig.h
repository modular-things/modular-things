#ifndef PID_HEATER_CONFIG_H_
#define PID_HEATER_CONFIG_H_

#define THERM_LOOP_MILLISECONDS 10

// this should function as all-the-config-we-need to match thermistors... 
// see i.e. https://www.tme.eu/Document/f9d2f5e38227fc1c7d979e546ff51768/NTCM-100K-B3950.pdf 
// or search "NTC 100K 3950 Table"

#define THERM_ABS_MAX_TEMP  110.0F
#define THERM_R1_VAL        9100.0F   // in the voltage divider, what's the top resistor's val, ohms ? 
#define THERM_VIN_VAL       3.3F      // voltage applied to top of thermistor-divider ?
#define THERM_ADC_RANGE     4096      // num. ticks in the ADC ?
#define THERM_PWM_RANGE     4096      // num. ticks in the pwm output 
#define THERM_PWM_FREQ      1000      // pwm frequency (slo in the bed, fast in a hotend)

#define THERM_TABLE_LEN   52        

float thermTable[THERM_TABLE_LEN][2] = {
  {0.0F,      321140.0F}, // {degs C, ohms}
  {5.0F,      250886.0F},
  {10.0F,     198530.0F},
  {15.0F,     156407.0F},
  {20.0F,     124692.0F},
  {25.0F,     100000.0F},
  {30.0F,     80650.0F},
  {35.0F,     65395.0F},
  {40.0F,     53300.0F},
  {42.0F,     49183.0F},
  {44.0F,     45419.0F},
  {46.0F,     41975.0F},
  {48.0F,     38822.0F},
  {50.0F,     35840.0F},
  {52.0F,     33284.0F},
  {54.0F,     30853.0F},
  {56.0F,     28620.0F},
  {58.0F,     26568.0F},
  {60.0F,     24681.0F},
  {62.0F,     22944.0F},
  {64.0F,     21344.0F},
  {66.0F,     19869.0F},
  {68.0F,     18509.0F},
  {70.0F,     17253.0F},
  {72.0F,     16094.0F},
  {74.0F,     15022.0F},
  {76.0F,     14031.0F},
  {78.0F,     13114.0F},
  {80.0F,     12256.0F},
  {82.0F,     11478.0F},
  {84.0F,     10748.0F},
  {86.0F,     10071.0F},
  {88.0F,     9443.0F},
  {90.0F,     8859.0F},
  {92.0F,     8316.0F},
  {94.0F,     7812.0F},
  {96.0F,     7342.0F},
  {98.0F,     6905.0F},
  {100.0F,    6498.0F},
  {102.0F,    6118.0F},
  {104.0F,    5763.0F},
  {106.0F,    5433.0F},
  {108.0F,    5124.0F},
  {110.0F,    4836.0F},
  {112.0F,    4566.0F},
  {114.0F,    4314.0F},
  {116.0F,    4077.0F},
  {118.0F,    3856.0F},
  {120.0F,    3649.0F},
  {122.0F,    3455.0F},
  {124.0F,    3273.0F},
  {125.0F,    3186.0F},
};

#endif 