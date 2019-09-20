export function poundsToKilograms(val: number) {
  return val * 0.453592;
}

export function kilogramsToPounds(val: number) {
  return parseFloat((val * 2.20462).toFixed(1));
}

export function feetInchesToCentimeters(feet: number, inches: number) {
  return (feet * 12 + inches) * 2.54;
}

export function centimetersToFeetInches(val: number) {
  const inch = val * 0.3937;
  if (Math.round(inch % 12) === 0) return Math.floor(inch / 12) + 1 + '.0';
  else return Math.floor(inch / 12) + '.' + Math.round(inch % 12);
}