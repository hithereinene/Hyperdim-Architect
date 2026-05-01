import { generateHypercube, expandShape } from './services/mathUtils.ts';

const cube = generateHypercube(3);
const exp = expandShape(cube);

console.log("Expanded Cube Vertices:", exp.vertices.length);
console.log("Expanded Cube Edges:", exp.edges.length);

let minLen = Infinity;
let maxLen = -Infinity;

exp.edges.forEach(e => {
    const p1 = exp.vertices[e.source].coords;
    const p2 = exp.vertices[e.target].coords;
    let distSq = 0;
    for (let i = 0; i < 3; i++) distSq += (p1[i] - p2[i]) ** 2;
    const dist = Math.sqrt(distSq);
    if (dist < minLen) minLen = dist;
    if (dist > maxLen) maxLen = dist;
});

console.log("Min edge length:", minLen);
console.log("Max edge length:", maxLen);
