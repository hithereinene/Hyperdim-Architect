import { generateHypercube, expandShape } from './services/mathUtils.ts';

const tesseract = generateHypercube(4);
const expanded = expandShape(tesseract);

let minLen = Infinity;
let maxLen = -Infinity;
expanded.edges.forEach(e => {
    const p1 = expanded.vertices[e.source].coords;
    const p2 = expanded.vertices[e.target].coords;
    let distSq = 0;
    for (let i = 0; i < p1.length; i++) distSq += (p1[i] - p2[i]) ** 2;
    const dist = Math.sqrt(distSq);
    if (dist < minLen) minLen = dist;
    if (dist > maxLen) maxLen = dist;
});

console.log("Expanded Tesseract Vertices:", expanded.vertices.length);
console.log("Expanded Tesseract Edges:", expanded.edges.length);
console.log("Min edge length:", minLen);
console.log("Max edge length:", maxLen);
