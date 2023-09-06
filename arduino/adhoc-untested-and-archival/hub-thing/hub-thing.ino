#include "Wire.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h> 
#include <SparkFun_STUSB4500.h>

Adafruit_SSD1306 display = Adafruit_SSD1306(128, 32, &Wire);
STUSB4500 usbpd; 
boolean pdSetupOK = false; 

void printMessage(String msg){
  display.clearDisplay();
  display.setCursor(0,0);
  display.print(msg);
  display.display();
}

/*
so, I've learned that I ordered the STUSB4500L (which only works to source 5v, 3A from usb-pd)
instead of the STUSB4500... which goes to the voltages we want,
so this firmware might work with the right chip. but I bonked it. 
I might anyways give up and use these cheaper usb-pd 'decoy' boards, though they're less-slick,
they're also mad simple... i.e. do-nothing-at-all boards, no external state, etc 
*/

void setup(){
  Serial.begin();
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(26, INPUT);

  Wire.begin();

  // setup the display 
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setRotation(2);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.clearDisplay();
  printMessage("bonjour...");

  delay(2500);

  // try it... 
  if(!usbpd.begin()){
    printMessage("usb-pd init failed");
  } else {
    pdSetupOK = true;

    // the thing has NVM settings... that are configured out-of-the-box, it seems,
    // to deliver 5v on 1, 15v on 2, and 20v on 3... 
    
    /* Read the Power Data Objects (PDO) highest priority */
    Serial.print("PDO Number: ");
    Serial.println(usbpd.getPdoNumber());

    /* Read settings for PDO1 */
    Serial.println();
    Serial.print("Voltage1 (V): ");
    Serial.println(usbpd.getVoltage(1));
    Serial.print("Current1 (A): ");
    Serial.println(usbpd.getCurrent(1));
    Serial.print("Lower Voltage Tolerance1 (%): ");
    Serial.println(usbpd.getLowerVoltageLimit(1));
    Serial.print("Upper Voltage Tolerance1 (%): ");
    Serial.println(usbpd.getUpperVoltageLimit(1));
    Serial.println();

    /* Read settings for PDO2 */
    Serial.print("Voltage2 (V): ");
    Serial.println(usbpd.getVoltage(2));
    Serial.print("Current2 (A): ");
    Serial.println(usbpd.getCurrent(2));
    Serial.print("Lower Voltage Tolerance2 (%): ");
    Serial.println(usbpd.getLowerVoltageLimit(2));
    Serial.print("Upper Voltage Tolerance2 (%): ");
    Serial.println(usbpd.getUpperVoltageLimit(2));
    Serial.println();

    /* Read settings for PDO3 */
    Serial.print("Voltage3 (V): ");
    Serial.println(usbpd.getVoltage(3));
    Serial.print("Current3 (A): ");
    Serial.println(usbpd.getCurrent(3));
    Serial.print("Lower Voltage Tolerance3 (%): ");
    Serial.println(usbpd.getLowerVoltageLimit(3));
    Serial.print("Upper Voltage Tolerance3 (%): ");
    Serial.println(usbpd.getUpperVoltageLimit(3));
    Serial.println();

    // let's try getting PDO 3 ?
    printMessage("setting to 2, resetting...");
    usbpd.setPdoNumber(2); 
    usbpd.setr
    usbpd.softReset();
    usbpd.write();
    delay(5000);

    /* Read the flex current value */
    Serial.print("Flex Current: ");
    Serial.println(usbpd.getFlexCurrent());

    /* Read the External Power capable bit */
    Serial.print("External Power: ");
    Serial.println(usbpd.getExternalPower());

    /* Read the USB Communication capable bit */
    Serial.print("USB Communication Capable: ");
    Serial.println(usbpd.getUsbCommCapable());

    /* Read the POWER_OK pins configuration */
    Serial.print("Configuration OK GPIO: ");
    Serial.println(usbpd.getConfigOkGpio());

    /* Read the GPIO pin configuration */
    Serial.print("GPIO Control: ");
    Serial.println(usbpd.getGpioCtrl());

    /* Read the bit that enables VBUS_EN_SNK pin only when power is greater than 5V */
    Serial.print("Enable Power Only Above 5V: ");
    Serial.println(usbpd.getPowerAbove5vOnly());

    /* Read bit that controls if the Source or Sink device's 
      operating current is used in the RDO message */
    Serial.print("Request Source Current: ");
    Serial.println(usbpd.getReqSrcCurrent());
  }
}

uint32_t lastBlink = 0;
uint32_t blinkInterval = 100;

void loop(){
  if(lastBlink + blinkInterval < millis()){
    if(pdSetupOK){
      // let's just post whatever voltage is on the PD line currently 
      int32_t val = analogRead(26);
      // there *should* be some offset here, i.e. current dev-board reports 0.21v where there is actually-zero 
      // first let's try to get that in a real-voltage at the ADC, 
      // supposing we are (?) scaling 0->1024 is 0->3v3, a guess:
      float v_sense = ((float)val / 1024.0F) * 3.3F;
      // in our voltage divider we have R1 = 10k, R2 = 1k, and 
      // https://ohmslawcalculator.com/voltage-divider-calculator 
      // vout = (vs * r2) / (r1 + r2)
      // we're reading vout down here, and want to know vs, 
      // so 
      // vout * (r1 + r2) = vs * r2 
      // (vout * (r1 + r2)) / r2 = vs
      float v_source = (v_sense * (10.0F + 1.0F)) / 1.0F;
      // so... should be ? 
      printMessage("USB supply: " + String(v_source, 2) + "v");
    }
    lastBlink = millis();
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }
}