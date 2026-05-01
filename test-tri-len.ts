import { generatePolygon, expandShape } from './services/mathUtils.ts';

const tri = generatePolygon(3);
const e1 = tri.edges[0];
const l1 = Math.sqrt(Math.pow(tri.vertices[e1.source].coords[0] - tri.vertices[e1.target].coords[0], 2) + Math.pow(tri.vertices[e1.source].coords[1] - tri.vertices[e1.target].coords[1], 2));

const expTri = expandShape(tri);
const e2 = expTri.edges[0];
const l2 = Math.sqrt(Math.pow(expTri.vertices[e2.source].coords[0] - expTri.vertices[e2.target].coords[0], 2) + Math.pow(expTri.vertices[e2.source].coords[1] - expTri.vertices[e2.target].coords[1], 2));

console.log("Triangle edge length:", l1);
console.log("Expanded Triangle edge length:", l2);
