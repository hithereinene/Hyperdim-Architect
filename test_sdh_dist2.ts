import { generateSmallDisprismatohexacosihecatonicosachoron } from './services/mathUtils.ts';

const sdh = generateSmallDisprismatohexacosihecatonicosachoron();
let dists = new Set<string>();
for (let i = 1; i < sdh.vertices.length; i++) {
    let d = 0;
    for (let j = 0; j < 4; j++) d += Math.pow(sdh.vertices[0].coords[j] - sdh.vertices[i].coords[j], 2);
    d = Math.sqrt(d);
    if (d > 0.001 && d < 0.3) {
        dists.add(d.toFixed(4));
    }
}
console.log("Distances:", Array.from(dists).sort());
