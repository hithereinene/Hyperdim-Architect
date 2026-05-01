import { generateIcosahedron, cupolizeShape } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const cupola = cupolizeShape(ico);

let extra = cupola.edges.filter(e => e.source < ico.vertices.length && e.target >= ico.vertices.length);
console.log('Icosahedron cross edges:', extra.length); // Should be 60

// Count edge lengths
let dists = [];
for (let e of extra) {
    let dSq = 0;
    for(let d=0; d<4; d++) dSq += Math.pow(cupola.vertices[e.source].coords[d] - cupola.vertices[e.target].coords[d], 2);
    dists.push(Math.sqrt(dSq));
}
console.log('Max cross edge:', Math.max(...dists));
console.log('Min cross edge:', Math.min(...dists));

