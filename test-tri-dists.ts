import { generatePolygon, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const tri = generatePolygon(3);
const expTri = expandShape(tri);

console.log("Triangle edges:");
for(let e of tri.edges) console.log(e);

console.log("Expanded Triangle edges:");
for(let e of expTri.edges) console.log(e);

console.log("Distances between tri and expTri:");
let minSq = Infinity;
for(let v1 of tri.vertices) {
    for(let v2 of expTri.vertices) {
        let distSq = 0;
        for(let d=0; d<2; d++) distSq += Math.pow((v1.coords[d]||0) - (v2.coords[d]||0), 2);
        if (distSq < minSq) minSq = distSq;
        // console.log(`dist: ${Math.sqrt(distSq)}`);
    }
}
console.log("Min dist:", Math.sqrt(minSq));

const targetDist = minSq <= 1 ? 1.0 : Math.sqrt(minSq + 1 * 1);
console.log("Target Dist for segmentochoron:", targetDist);

let crossEdges = 0;
for(let v1 of tri.vertices) {
    for(let v2 of expTri.vertices) {
        let distSq = 0;
        for(let d=0; d<2; d++) distSq += Math.pow((v1.coords[d]||0) - (v2.coords[d]||0), 2);
        distSq += 1.0; // height squared
        const dist = Math.sqrt(distSq);
        if (Math.abs(dist - targetDist) < 0.25) {
            crossEdges++;
        }
    }
}
console.log("Cross edges:", crossEdges);

