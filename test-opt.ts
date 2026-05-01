import { generateIcosahedron, expandShape, generateHypercube, generateSimplex, generateDodecahedron } from './services/mathUtils.ts';

const testTol = (s1, s2, n, expected) => {
    for(let tol of [0.15, 0.16, 0.17, 0.18, 0.19, 0.20, 0.21, 0.25]) {
        let t = 0;
        for(let i=0; i<s1.vertices.length; i++) {
            for(let j=0; j<s2.vertices.length; j++) {
                let distSq = 0;
                for(let d=0; d<s1.dimension; d++) distSq += Math.pow((s1.vertices[i].coords[d]||0) - (s2.vertices[j].coords[d]||0), 2);
                let tgt = Math.sqrt(0.1 + 1.0); // mock target
                if (Math.abs(Math.sqrt(distSq+1.0) - 1.0) < tol) t++;
            }
        }
        if (t === expected) {
            console.log(n, 'Tol', tol, 'SUCCEEDS');
            return;
        }
    }
    console.log(n, 'FAILED');
};

const tet = generateSimplex(3);
testTol(tet, expandShape(tet), 'Tet Cupola', 12);
testTol(generateHypercube(3), expandShape(generateHypercube(3)), 'Cube Cupola', 24);
const ico = generateIcosahedron();
testTol(ico, expandShape(ico), 'Ico Cupola', 60);

