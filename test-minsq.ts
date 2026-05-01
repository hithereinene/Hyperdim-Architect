import { generateIcosahedron, expandShape, scaleShape, relaxShape } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const expanded = expandShape(ico);

let minSq = Infinity;
for(let v1 of ico.vertices) {
    for(let v2 of expanded.vertices) {
        let distSq = 0;
        for(let d=0; d<3; d++) distSq += Math.pow((v1.coords[d]||0) - (v2.coords[d]||0), 2);
        if (distSq < minSq) minSq = distSq;
    }
}
console.log('minSq', minSq, 'Math.sqrt(minSq)', Math.sqrt(minSq));

