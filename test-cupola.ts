import { generateHypercube, cupolizeShape } from './services/mathUtils.ts';

const cube = generateHypercube(3);
console.log("CUBE:", cube.dimension, cube.vertices.length, cube.edges.length);

const cupola = cupolizeShape(cube);
console.log("CUPOLA:", cupola.dimension, cupola.vertices.length, cupola.edges.length);
