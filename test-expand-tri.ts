import { generatePolygon, expandShape } from './services/mathUtils.ts';
const tri = generatePolygon(3);
const expTri = expandShape(tri);
console.log(expTri.vertices.length, expTri.edges.length);
