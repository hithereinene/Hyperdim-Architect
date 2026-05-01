import { generateIcosahedron, cupolizeShape, generateOctahedron, generateSimplex } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const originalEdges = ico.edges.length;

const cupola = cupolizeShape(ico);
const baseEdges = cupola.edges.length - originalEdges; // rough

let extra = cupola.edges.filter(e => e.source < ico.vertices.length && e.target >= ico.vertices.length);
console.log('Icosahedron cross edges:', extra.length); // Should be 60

const oct = generateOctahedron();
const octc = cupolizeShape(oct);
let extraOct = octc.edges.filter(e => e.source < oct.vertices.length && e.target >= oct.vertices.length);
console.log('Octahedron cross edges:', extraOct.length); // Should be 24 (6 vertices * 4)

const tet = generateSimplex(3);
const tetc = cupolizeShape(tet);
let extraTet = tetc.edges.filter(e => e.source < tet.vertices.length && e.target >= tet.vertices.length);
console.log('Tetrahedron cross edges:', extraTet.length); // Should be 12 (4 * 3)

