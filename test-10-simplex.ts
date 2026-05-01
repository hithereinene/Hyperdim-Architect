import { generateSimplex, rectifyShape, generateOFFContent } from './services/mathUtils.ts';

const simplex = generateSimplex(10);
const rectSimplex = rectifyShape(simplex);
console.log('dim:', rectSimplex.dimension);
const off = generateOFFContent(rectSimplex);
console.log(off.substring(0, 200));
