import { generateSimplex, expandShape } from './services/mathUtils.ts';
const s1 = generateSimplex(3);
const s2 = expandShape(s1);
console.log('Tetrahedron expanded...');
for(let tol of [0.20, 0.21, 0.22, 0.23, 0.24, 0.25]) {
    let t = 0;
    for(let i=0; i<s1.vertices.length; i++) {
        for(let j=0; j<s2.vertices.length; j++) {
            let distSq = 0;
            for(let d=0; d<3; d++) distSq += Math.pow((s1.vertices[i].coords[d]||0) - (s2.vertices[j].coords[d]||0), 2);
            if (Math.abs(Math.sqrt(distSq+1.0) - 1.0) < tol) t++;
        }
    }
    console.log('tol', tol, 'edges', t);
}
