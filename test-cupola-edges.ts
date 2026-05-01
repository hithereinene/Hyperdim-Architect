import { generateIcosahedron, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const expIco = expandShape(ico);

const cupola = generateSegmentochoron(ico, expIco, 'test', 'test');

// Count how many cross-connections there are.
let count = 0;
cupola.edges.forEach(e => {
    if (e.source < ico.vertices.length && e.target >= ico.vertices.length) {
        count++;
    }
});
console.log("Cross edges:", count);
