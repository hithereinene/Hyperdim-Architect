import { generateIcosahedron, expandShape, generateHypercube } from './services/mathUtils.ts';
const ico = generateIcosahedron();
const eico = expandShape(generateIcosahedron());
let total = 0;
for (let i = 0; i < ico.vertices.length; i++) {
    for (let j = 0; j < eico.vertices.length; j++) {
        let distSq = 0;
        for(let d=0; d<3; d++) distSq += Math.pow((ico.vertices[i].coords[d]||0) - (eico.vertices[j].coords[d]||0), 2);
        let dist = Math.sqrt(distSq + 1.0);
        if (Math.abs(dist - 1.0) < 0.21) total++;
    }
}
console.log('Ico Cupola Tol 0.21:', total);

const testTol = (s1, s2, n) => {
    let t = 0;
    for(let i=0; i<s1.vertices.length; i++) {
        for(let j=0; j<s2.vertices.length; j++) {
            let distSq = 0;
            for(let d=0; d<3; d++) distSq += Math.pow((s1.vertices[i].coords[d]||0) - (s2.vertices[j].coords[d]||0), 2);
            if (Math.abs(Math.sqrt(distSq+1.0) - 1.0) < 0.21) t++;
        }
    }
    console.log(n, t);
};

testTol(generateHypercube(3), generateHypercube(3), 'Cube Prism');
testTol(generateHypercube(3), ico, 'Cube atop Ico');
