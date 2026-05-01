import { generateIcosahedron, expandShape } from './services/mathUtils.ts';

const v1 = generateIcosahedron().vertices;
const v2 = expandShape(generateIcosahedron()).vertices;
let minSq = Infinity;
for (let i = 0; i < v1.length; i++) {
    for (let j = 0; j < v2.length; j++) {
        let distSq = 0;
        for (let d = 0; d < 3; d++) {
            distSq += Math.pow((v1[i].coords[d]||0) - (v2[j].coords[d]||0), 2);
        }
        if (distSq < minSq) minSq = distSq;
    }
}
console.log("minSq", minSq);
console.log("targetDist", minSq <= 1 ? 1.0 : Math.sqrt(minSq + 1 * 1));
