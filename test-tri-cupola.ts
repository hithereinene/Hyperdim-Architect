import { generateSimplex, cupolizeShape } from './services/mathUtils.ts';

const t = generateSimplex(2); // Triangle
console.log('Triangle cupola:');
const tc = cupolizeShape(t);
console.log(tc.vertices.length, tc.edges.length);

const tet = generateSimplex(3); // Tetrahedron
console.log('Tetrahedron cupola:');
const tetc = cupolizeShape(tet);
console.log(tetc.vertices.length, tetc.edges.length);
