import { generate120Cell } from './services/mathUtils.ts';

const s120 = generate120Cell();
const v0 = s120.vertices[0].coords;

const distances = new Set();
for (let i=1; i<s120.vertices.length; i++) {
    const v1 = s120.vertices[i].coords;
    let distSq = 0;
    for (let j=0; j<4; j++) {
        distSq += (v0[j] - v1[j])**2;
    }
    const dist = Math.round(Math.sqrt(distSq) * 1000) / 1000;
    distances.add(dist);
}
console.log("120-cell Distances from v0:", Array.from(distances).sort());
