import { generateIcosahedron, cupolizeShape, generateOFFContent } from './services/mathUtils.ts';
const shape = generateIcosahedron();
const cupola = cupolizeShape(shape);
const off = generateOFFContent(cupola);
console.log(off.split('\n').filter(l => l.startsWith('3 ')).length, 'triangles');
console.log(off.split('\n').filter(l => l.startsWith('4 ')).length, 'squares');
console.log(off.split('\n').filter(l => l.startsWith('5 ')).length, 'pentagons');
console.log(off.split('\n').length, 'lines total');
