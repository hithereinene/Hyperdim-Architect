import { generateIcosahedron, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const expIco = expandShape(ico);

console.log("Icosahedron: v=", ico.vertices.length, "e=", ico.edges.length);
console.log("Expanded: v=", expIco.vertices.length, "e=", expIco.edges.length);

const cupola = generateSegmentochoron(ico, expIco, 'test', 'test');
console.log("Cupola: v=", cupola.vertices.length, "e=", cupola.edges.length);

// Let's also check the 24-cell
import { generate24Cell } from './services/mathUtils.ts';
const cell24 = generate24Cell();
const exp24 = expandShape(cell24);
console.log("24-cell: v=", cell24.vertices.length, "e=", cell24.edges.length);
console.log("Expanded: v=", exp24.vertices.length, "e=", exp24.edges.length);
const cupola24 = generateSegmentochoron(cell24, exp24, 'test2', 'test2');
console.log("Cupola: v=", cupola24.vertices.length, "e=", cupola24.edges.length);
