import { generateIcosahedron, cupolizeShape } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const cupola = cupolizeShape(ico);

let extra = cupola.edges.filter(e => e.source < ico.vertices.length && e.target >= ico.vertices.length);

console.log('first 5 cross edges lengths:');
for (let e of extra.slice(0, 5)) {
    let dSq = 0;
    for(let d=0; d<4; d++) dSq += Math.pow((cupola.vertices[e.source].coords[d]||0) - (cupola.vertices[e.target].coords[d]||0), 2);
    console.log(Math.sqrt(dSq));
}
