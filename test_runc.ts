import { generateHypercube, rectifyShape, truncateShape } from './services/mathUtils.ts';

const tess = generateHypercube(4);
const rr = rectifyShape(rectifyShape(tess));
const trr = truncateShape(rr);

console.log("Tess:", tess.vertices.length, tess.edges.length);
console.log("RectRect:", rr.vertices.length, rr.edges.length);
console.log("TruncRectRect:", trr.vertices.length, trr.edges.length);
