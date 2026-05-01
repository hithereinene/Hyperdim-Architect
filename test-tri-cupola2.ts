import { generateOctahedron, generateIcosahedron, cupolizeShape } from './services/mathUtils.ts';

const oct = generateOctahedron();
console.log('Octahedron cupola:');
const octc = cupolizeShape(oct);
console.log(octc.vertices.length, octc.edges.length);

const ico = generateIcosahedron();
console.log('Icosahedron cupola:');
const icoc = cupolizeShape(ico);
console.log(icoc.vertices.length, icoc.edges.length);
