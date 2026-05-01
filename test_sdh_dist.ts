import { generateSmallDisprismatohexacosihecatonicosachoron } from './services/mathUtils.ts';

const sdh = generateSmallDisprismatohexacosihecatonicosachoron();
let minD = Infinity;
let maxD = -Infinity;
for (let i = 1; i < sdh.vertices.length; i++) {
    let d = 0;
    for (let j = 0; j < 4; j++) d += Math.pow(sdh.vertices[0].coords[j] - sdh.vertices[i].coords[j], 2);
    d = Math.sqrt(d);
    if (d > 0.001 && d < minD) minD = d;
}
console.log("Min distance:", minD);
