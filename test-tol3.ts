import { generateSimplex, generateOctahedron, expandShape, generatePolygon } from './services/mathUtils.ts';

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

const tet = generateSimplex(3);
testTol(tet, expandShape(tet), 'Tet Cupola'); // expect 12

const oct = generateOctahedron();
testTol(oct, expandShape(oct), 'Oct Cupola'); // expect 24

const tri = generatePolygon(3);
testTol(tri, expandShape(tri), 'Tri Cupola'); // expect 6
