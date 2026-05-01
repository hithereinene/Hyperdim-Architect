import { generatePolygon, cupolizeShape, generateOFFContent } from './services/mathUtils.ts';
const tri = generatePolygon(3);
const cupola = cupolizeShape(tri);
const off = generateOFFContent(cupola);
console.log(off);
