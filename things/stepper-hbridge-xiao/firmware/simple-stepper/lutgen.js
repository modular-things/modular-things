import fs from 'fs';
import process from 'process';

// Function to generate the sinusoid values
function generateSinusoid(length, amplitude) {
  let values = [];
  for (let i = 0; i < length; i++) {
    let angle = (Math.PI * i) / (length - 1);
    let value = Math.round(amplitude * Math.sin(angle));
    values.push(value);
  }
  return values;
}

// Main function to create the lookup table
function createLookupTable(length, amplitude) {
  const values = generateSinusoid(length, amplitude);
  let lutString = `#ifndef STEPPER_LUT_H_\n#define STEPPER_LUT_H_\n\n`
  lutString += `#include <Arduino.h>\n\n`;
  lutString += `#define LUT_LENGTH ${length} \n`;
  lutString += `#define PWM_PERIOD ${amplitude}\n\n`;
  lutString += `const uint16_t LUT[LUT_LENGTH] = {\n`;
  // do 'em row by row 
  let i = 0;
  while (i < values.length) {
    lutString += `  `;
    for (let j = 0; j < 16; j++) {
      lutString += `${values[i]}, `;
      i++;
      if (i >= values.length) break;
    }
    lutString += `\n`;
  }
  // lutString += values.join(',') + ',\n';
  lutString += '};\n\n';
  lutString += `#endif\n`
  return lutString;
}

// Read command-line arguments
const length = parseInt(process.argv[2]);
const amplitude = parseInt(process.argv[3]);

// Validate arguments
if (isNaN(length) || isNaN(amplitude)) {
  console.error('Usage: node script.js <length> <amplitude>');
  process.exit(1);
}

// Generate the lookup table string
const lutString = createLookupTable(length, amplitude);

// Write to file
fs.writeFile('stepperLUT.h', lutString, (err) => {
  if (err) {
    console.error('Error writing to file:', err);
  } else {
    console.log('Lookup table written to stepperLUT.h');
  }
});
