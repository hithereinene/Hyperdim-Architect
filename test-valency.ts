import { generateIcosahedron, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const cupola = generateSegmentochoron(ico, expandShape(ico), 'test', 'test');
console.log('valencies in ico:');
const adj = new Array(ico.vertices.length).fill(0);
for (let e of ico.edges) {
    adj[e.source]++;
    adj[e.target]++;
}

for(let i=0; i<adj.length; i++) console.log(adj[i]);
