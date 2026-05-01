import { generateHypercube, generateOFFContent, parseOFF } from './services/mathUtils.ts';
const tesseract = generateHypercube(4);
const off = generateOFFContent(tesseract);
const parsed = parseOFF(off);
console.log('Parsed Dim:', parsed.dimension, 'Verts:', parsed.vertices.length, 'Edges:', parsed.edges.length, 'Faces:', parsed.faces?.length, 'Cells:', parsed.cells?.length);
