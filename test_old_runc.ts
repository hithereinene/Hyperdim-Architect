import { generateHypercube, truncateShape, rectifyShape } from './services/mathUtils.ts';

const tess = generateHypercube(4);
const t1 = truncateShape(tess, 0.5);
const r1 = rectifyShape(t1);
const runc = truncateShape(r1, 0.333);

console.log("Tess:", tess.vertices.length, tess.edges.length);
console.log("T1:", t1.vertices.length, t1.edges.length);
console.log("R1:", r1.vertices.length, r1.edges.length);
console.log("Runc:", runc.vertices.length, runc.edges.length);
