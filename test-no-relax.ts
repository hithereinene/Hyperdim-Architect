import { generateIcosahedron, expandShape } from './services/mathUtils.ts';

// Monkey patch expandShape to skip relaxShape?
// I can just copy the un-relaxed vertices computation
const dim = 3;
const shape = generateIcosahedron();
let pts = shape.vertices.map(v => v.coords.map(c=>c||0));
const centroid = new Array(dim).fill(0);
pts.forEach(p => {
    for (let i = 0; i < dim; i++) centroid[i] += p[i];
});
for (let i = 0; i < dim; i++) centroid[i] /= pts.length;
pts = pts.map(p => p.map((val, i) => val - centroid[i]));

// Simplified version of expandShape without relax
// Use distance check on pts
let dists = [];
for(let d=0; d<3; d++) dists.push(Math.sqrt(pts[0][d]*pts[0][d] + pts[1][d]*pts[1][d]));
console.log(dists);

