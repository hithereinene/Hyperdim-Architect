import { generateHypercube, expandShape } from './services/mathUtils.ts';

const tesseract = generateHypercube(4);
const expanded = expandShape(tesseract);

console.log("Expanded Tesseract Vertices:", expanded.vertices.length);
console.log("Expanded Tesseract Edges:", expanded.edges.length);
