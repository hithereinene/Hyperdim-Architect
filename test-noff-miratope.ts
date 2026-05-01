import { generateSimplex, rectifyShape, generateOFFContent } from './services/mathUtils.ts';
const shape = rectifyShape(generateSimplex(10));
const off = generateOFFContent(shape);
console.log(off.substring(0, 500));
