import { generate600Cell } from './services/mathUtils.ts';

const s600 = generate600Cell();
const v0 = s600.vertices[0].coords;

const distances = new Set();
for (let i=1; i<s600.vertices.length; i++) {
    const v1 = s600.vertices[i].coords;
    let distSq = 0;
    for (let j=0; j<4; j++) {
        distSq += (v0[j] - v1[j])**2;
    }
    const dist = Math.round(Math.sqrt(distSq) * 1000) / 1000;
    distances.add(dist);
}
console.log("Distances from v0:", Array.from(distances).sort());
