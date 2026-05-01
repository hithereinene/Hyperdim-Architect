import { generateSimplex, cupolizeShape, generateOFFContent } from './services/mathUtils.ts';
const shape = generateSimplex(3);
const cupola = cupolizeShape(shape);
const off = generateOFFContent(cupola);
console.log('Success');
