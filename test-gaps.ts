import { generateIcosahedron, expandShape, generateHypercube } from './services/mathUtils.ts';
const ico = generateIcosahedron();
const eico = expandShape(generateIcosahedron());
for (let i = 0; i < 2; i++) {
    let dists = [];
    for (let j = 0; j < eico.vertices.length; j++) {
        let distSq = 0;
        for(let d=0; d<3; d++) distSq += Math.pow((ico.vertices[i].coords[d]||0) - (eico.vertices[j].coords[d]||0), 2);
        distSq += 1.0;
        dists.push(Math.sqrt(distSq));
    }
    dists.sort((a,b) => a-b);
    let gaps = [];
    for(let k=1; k<15; k++) gaps.push((dists[k]-dists[k-1]).toFixed(3));
    console.log(`v${i} dists[0..5]:`, dists.slice(0, 6).map(d => d.toFixed(3)).join(', '));
    console.log(`v${i} gaps:`, gaps.join(', '));
}
