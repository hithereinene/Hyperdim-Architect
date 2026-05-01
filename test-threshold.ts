import { generateIcosahedron, expandShape } from './services/mathUtils.ts';
const ico = generateIcosahedron();
const eico = expandShape(generateIcosahedron());
let total = 0;
for (let i = 0; i < ico.vertices.length; i++) {
    let dists = [];
    for (let j = 0; j < eico.vertices.length; j++) {
        let distSq = 0;
        for(let d=0; d<3; d++) distSq += Math.pow((ico.vertices[i].coords[d]||0) - (eico.vertices[j].coords[d]||0), 2);
        distSq += 1.0;
        dists.push(Math.sqrt(distSq));
    }
    dists.sort((a,b) => a-b);
    let minDist = dists[0];
    let connected = dists.filter(d => d <= minDist + 0.12).length;
    total += connected;
}
console.log('Per vertex minDist+0.12:', total, 'Expected:', 60);
