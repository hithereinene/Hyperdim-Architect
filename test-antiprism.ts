import { generateHypercube, antiprismizeShape, cupolizeShape } from './services/mathUtils.ts';

const sq = generateHypercube(2);
const sqA = antiprismizeShape(sq);

console.log(`Square Antiprism: V=${sqA.vertices.length}, E=${sqA.edges.length}`);

const cube = generateHypercube(3);
const cubeA = antiprismizeShape(cube);
console.log(`Cube Antiprism: V=${cubeA.vertices.length}, E=${cubeA.edges.length}`);

// also test cupolize on tetrahedron
import { generateSimplex } from './services/mathUtils.ts';
const tetra = generateSimplex(3);
const tetraC = cupolizeShape(tetra);
console.log(`Tetrahedron Cupola: V=${tetraC.vertices.length}, E=${tetraC.edges.length}`);
