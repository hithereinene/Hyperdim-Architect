import { generatePolygon, cupolizeShape } from './services/mathUtils.ts';
const tri = generatePolygon(3);
const result = cupolizeShape(tri);
console.log('Result dim:', result.dimension);
console.log('Result verts:', result.vertices.length);
console.log('Result edges:', result.edges.length);
