import { generateIcosahedron, expandShape, scaleShape, relaxShape } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const expanded = expandShape(ico);

const h = 1.0;
const topV = ico.vertices[0].coords.map(c => c || 0);

const dists = expanded.vertices.map((v, idx) => {
    let distSq = 0;
    for(let d=0; d<3; d++) distSq += Math.pow(v.coords[d] - topV[d], 2);
    // add height
    distSq += h * h;
    return { idx, dist: Math.sqrt(distSq) };
});

dists.sort((a,b) => a.dist - b.dist);
console.log(dists.slice(0, 15));

