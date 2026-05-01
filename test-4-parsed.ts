import { generateSimplex, generateOFFContent, parseOFF, truncateShape } from './services/mathUtils.ts';

const simplex = generateSimplex(4);
const trunc = truncateShape(simplex, 0.5);
const off = generateOFFContent(trunc);
console.log('Original Dim:', trunc.dimension, 'Verts:', trunc.vertices.length, 'Edges:', trunc.edges.length, 'Faces:', trunc.faces?.length, 'Cells:', trunc.cells?.length);

const parsed = parseOFF(off);
console.log('Parsed Dim:', parsed.dimension, 'Verts:', parsed.vertices.length, 'Edges:', parsed.edges.length, 'Faces:', parsed.faces?.length, 'Cells:', parsed.cells?.length);
