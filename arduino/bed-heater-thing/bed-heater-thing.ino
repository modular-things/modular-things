#include <osap.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels

#define X_POS 0
#define Y_POS 0

#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT);

OSAP_Runtime osap;
OSAP_Gateway_USBSerial serLink(&Serial);
OSAP_Port_DeviceNames namePort("bedHeater");

// the hardware config... i.e. pins 

#define THERM_ADC_PIN     27
#define THERM_PWM_PIN     28

// loop timing config 

#define THERM_LOOP_MILLISECONDS 10

// this should function as all-the-config-we-need to match thermistors... 
// see i.e. https://www.tme.eu/Document/f9d2f5e38227fc1c7d979e546ff51768/NTCM-100K-B3950.pdf 
// or search "NTC 100K 3950 Table"

#define THERM_R1_VAL      9100.0F   // in the voltage divider, what's the top resistor's val, ohms ? 
#define THERM_VIN_VAL     3.3F      // voltage applied to top of thermistor-divider ?
#define THERM_ADC_RANGE   4096      // num. ticks in the ADC ?
#define THERM_PWM_RANGE   4096      // num. ticks in the pwm output 

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

/*
t: 0.0 rd: 993.1
t: 5.0 rd: 984.7
t: 10.0 rd: 974.9
t: 15.0 rd: 962.5
t: 20.0 rd: 948.0
t: 25.0 rd: 930.9
t: 30.0 rd: 911.0
t: 35.0 rd: 888.2
t: 40.0 rd: 862.2
t: 42.0 rd: 851.0
t: 44.0 rd: 839.2
t: 46.0 rd: 827.0
t: 48.0 rd: 814.3
t: 50.0 rd: 800.6
t: 52.0 rd: 787.4
t: 54.0 rd: 773.3
t: 56.0 rd: 758.9
t: 58.0 rd: 744.0
t: 60.0 rd: 728.7
t: 62.0 rd: 713.2
t: 64.0 rd: 697.3
t: 66.0 rd: 681.2
t: 68.0 rd: 664.8
t: 70.0 rd: 648.3
t: 72.0 rd: 631.6
t: 74.0 rd: 614.8
t: 76.0 rd: 597.9
t: 78.0 rd: 581.0
t: 80.0 rd: 563.9
t: 82.0 rd: 547.2
t: 84.0 rd: 530.5
t: 86.0 rd: 513.8
t: 88.0 rd: 497.3
t: 90.0 rd: 481.0
t: 92.0 rd: 464.9
t: 94.0 rd: 449.1
t: 96.0 rd: 433.5
t: 98.0 rd: 418.3
t: 100.0 rd: 403.3
t: 102.0 rd: 388.7
t: 104.0 rd: 374.4
t: 106.0 rd: 360.5
t: 108.0 rd: 346.9
t: 110.0 rd: 333.8
t: 112.0 rd: 321.0
t: 114.0 rd: 308.6
t: 116.0 rd: 296.6
t: 118.0 rd: 285.0
t: 120.0 rd: 273.8
t: 122.0 rd: 262.9
t: 124.0 rd: 252.5
t: 125.0 rd: 247.4
*/

void setupThermalTables(void){
  // so, we're going to re-write that table so that the second value represents 
  // the ADC reading we'd expect to see at that temperature, 
  // so, 
  for(uint8_t t = 0; t < THERM_TABLE_LEN; t ++){
    // here's the resistance, 
    float resistance = thermTable[t][1];
    // the voltage we would expect, given that r is per 
    // the voltage divider, where v_out = (v_in * r2) / (r1 + r2)
    // where r1 is the "top", and r2 is... this changing one 
    float voltage = (THERM_VIN_VAL * resistance) / (THERM_R1_VAL + resistance);
    // that's rad, but we're going to read our ADC in bits, so we 
    // additionally want to scale it as such: 
    float reading = voltage * ((float)THERM_ADC_RANGE / THERM_VIN_VAL);
    // and we want to store that in-place; 
    thermTable[t][1] = reading;
    // debug !
    // Serial.println("t: " + String(thermTable[t][0], 1) + " rd: " + String(thermTable[t][1], 1));
    // delay(10);
  }
}

void setupThermalHardware(void){
  // do 0-4096 analog readings 
  analogReadResolution(12);
  // setup our output to 1kHz / 12 bit:
  analogWriteFreq(1000);
  analogWriteResolution(12);
  // and it'll be an output:
  pinMode(THERM_PWM_PIN, OUTPUT);
}

float getCurrentTemp(void){
  // get le reading: 
  uint32_t reading = analogRead(THERM_ADC_PIN);
  // the table ends up trending monotonic-down, so we can do 
  for(uint8_t t = 0; t < THERM_TABLE_LEN - 1; t ++){
    if(thermTable[t][1] > reading && reading > thermTable[t + 1][1]){
      // we are betwixt [t]:[t + 1]
      // let's get sensible labels and then calc
      float y1 = thermTable[t][0];
      float y2 = thermTable[t + 1][0];
      float x1 = thermTable[t][1];
      float x2 = thermTable[t + 1][1];
      // okay, then interpolate: 
      float y = y1 + ((reading - x1) * (y2 - y1)) / (x2 - x1);
      return y;
    }
  }
  // if we never found a match, 
  // report big temps (safety!)
  return 9000.0F;
}

float _setPoint = 25.0F;

float _errEstimate = 0.0F;
float _errEstimateLast = 0.0F;
float _errAlpha = 0.05F;     // 0-1 trust in new measurements 
float _errIntegral = 0.0F;
float _pTerm = 0.20F;
float _dTerm = 0.04F;
float _iTerm = 0.0025F;
float _iLim = 50.0F;

float _delT = 0.001F * (float)THERM_LOOP_MILLISECONDS;

void runThermalLoop(boolean debug){
  // here's le-temp, 
  float temp = getCurrentTemp();

  // calc an error, set a simple p-term, 
  // then outp... with power, etc, let's see if we can go to i.e. 40degs 
  float err = _setPoint - temp;
  _errEstimate = err * _errAlpha + _errEstimate * (1.0F - _errAlpha);

  // track a derivative of the error, 
  float errDerivative = (_errEstimateLast - _errEstimate) * (1 / _delT);
  _errEstimateLast = _errEstimate;

  // and track-and-cap the integral, 
  _errIntegral += _errEstimate * _delT;
  if(_errIntegral > _iLim){
    _errIntegral = _iLim;
  }
  if(_errIntegral < - _iLim){
    _errIntegral = - _iLim;
  }

  // now we can do:

  float pContrib = _errEstimate * _pTerm;
  float iContrib = _errIntegral * _iTerm;
  float dContrib = errDerivative * _dTerm;
  float output = pContrib + iContrib + dContrib;

  // write that to the pin:
  if(output < 0.0F) output = 0.0F;
  if(output > THERM_PWM_RANGE) output = THERM_PWM_RANGE;
  analogWrite(THERM_PWM_PIN, output * THERM_PWM_RANGE);

  // do pront 
  if(debug){
    display.clearDisplay();
    display.setCursor(0,0);
    display.setTextSize(2);
    display.println(String(temp, 1));
    display.println("");
    display.setTextSize(1);
    display.println("SP:  " + String(_setPoint, 1));
    display.println("PW:  " + String(output, 2));
    display.println("---------");
    // oddity is for bouncy -ve signs 
    pContrib < 0 ? display.print("P:  ") : display.print("P:   ");  display.println(pContrib, 2);
    iContrib < 0 ? display.print("I:  ") : display.print("I:   ");  display.println(iContrib, 2);
    dContrib < 0 ? display.print("D:  ") : display.print("D:   ");  display.println(dContrib, 2);
    display.display();
  }
}

// -------------------------- Arduino Setup 

void setup() {
  // fer debuggen 
  // Serial.begin();
  // while(!Serial);
  // setup the display... 
  display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS);

  display.clearDisplay();
  display.display();

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(true);
  display.setRotation(1);

  // and our debug light
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // demo-worlds, 
  display.setCursor(0,0);
  display.setTextSize(2);
  display.println("TEMP");
  display.println("");
  display.setTextSize(1);
  display.println("SP: ___");
  display.println("PW: ___");
  display.display();

  // and setup our tables and hardware 
  setupThermalTables();
  setupThermalHardware();

  // do the osap setup, 
  osap.begin();
}

// -------------------------- Arduino Loop

uint32_t loopLastTime = 0;
uint32_t loopPeriod = THERM_LOOP_MILLISECONDS;  // milliseconds 
uint32_t debugModulo = 0;

void loop() {
  osap.loop();
  if(loopLastTime + loopPeriod < millis()){
    loopLastTime = millis();
    debugModulo ++;
    if(debugModulo >= 10){
      debugModulo = 0;
      digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
      runThermalLoop(true);
    } else {
      runThermalLoop(false);
    }
  }
}
