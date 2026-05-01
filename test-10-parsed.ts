import { generateSimplex, rectifyShape, generateOFFContent, parseOFF } from './services/mathUtils.ts';

const simplex = generateSimplex(10);
const rectSimplex = rectifyShape(simplex);
const off = generateOFFContent(rectSimplex);
console.log('Original Dim:', rectSimplex.dimension, 'Verts:', rectSimplex.vertices.length, 'Edges:', rectSimplex.edges.length);

const parsed = parseOFF(off);
console.log('Parsed Dim:', parsed.dimension, 'Verts:', parsed.vertices.length, 'Edges:', parsed.edges.length, 'Faces:', parsed.faces?.length);

