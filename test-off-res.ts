import { generateIcosahedron, cupolizeShape, generateOFFContent } from './services/mathUtils.ts';
const shape = generateIcosahedron();
const cupola = cupolizeShape(shape);
const off = generateOFFContent(cupola);
let Fs = off.split('\n').filter(l => l.match(/^[345678] /));
let count = [0,0,0,0,0,0,0,0,0];
Fs.forEach(f => count[parseInt(f.split(' ')[0])]+=1);
console.log(count);
