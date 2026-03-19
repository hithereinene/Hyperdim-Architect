import { generate600Cell } from './services/mathUtils.ts';

const s600 = generate600Cell();
const v0 = s600.vertices[0].coords;

let count = 0;
for (let i=1; i<s600.vertices.length; i++) {
    const v1 = s600.vertices[i].coords;
    let distSq = 0;
    for (let j=0; j<4; j++) {
        distSq += (v0[j] - v1[j])**2;
    }
    const dist = Math.sqrt(distSq);
    if (Math.abs(dist - 0.6180339887) < 0.01) {
        count++;
    }
}
console.log("Neighbors at 0.618:", count);
