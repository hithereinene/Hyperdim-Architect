import { generateIcosahedron, expandShape } from './services/mathUtils.ts';
const ico = generateIcosahedron();
const eico = expandShape(generateIcosahedron());
let total = 0;
for (let i = 0; i < ico.vertices.length; i++) {
    for (let j = 0; j < eico.vertices.length; j++) {
        let distSq = 0;
        for(let d=0; d<3; d++) distSq += Math.pow((ico.vertices[i].coords[d]||0) - (eico.vertices[j].coords[d]||0), 2);
        distSq += 1.0;
        let dist = Math.sqrt(distSq);
        if (Math.abs(dist - 1.0) < 0.22) total++;
    }
}
console.log('Tol 0.22:', total);
