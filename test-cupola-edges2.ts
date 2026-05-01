import { generate24Cell, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const cell24 = generate24Cell();
const exp24 = expandShape(cell24);
const cupola = generateSegmentochoron(cell24, exp24, 'test', 'test');

let count = 0;
cupola.edges.forEach(e => {
    if (e.source < cell24.vertices.length && e.target >= cell24.vertices.length) {
        count++;
    }
});
console.log("Cross edges 24-cell:", count);
