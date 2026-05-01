import { generateIcosahedron, expandShape, generateHypercube, generateOctahedron, generateSimplex } from './services/mathUtils.ts';

const testGap = (s1, s2, n, expected) => {
    let t = 0;
    for(let i=0; i<s1.vertices.length; i++) {
        let dists = [];
        for(let j=0; j<s2.vertices.length; j++) {
            let distSq = 0;
            for(let d=0; d<3; d++) distSq += Math.pow((s1.vertices[i].coords[d]||0) - (s2.vertices[j].coords[d]||0), 2);
            dists.push({ j, d: Math.sqrt(distSq+1.0) });
        }
        dists.sort((a,b)=>a.d - b.d);
        
        let bestGapIdx = 0;
        let bestGap = 0;
        for(let k=1; k<Math.min(12, dists.length); k++) {
            let gap = dists[k].d - dists[k-1].d;
            if (gap > bestGap) {
                bestGap = gap;
                bestGapIdx = k;
            }
        }
        t += bestGapIdx;
    }
    console.log(n, t, 'Expected:', expected);
};

const ico = generateIcosahedron();
const oct = generateOctahedron();
const tet = generateSimplex(3);

testGap(ico, expandShape(ico), 'Ico Cupola', 60);
testGap(oct, expandShape(oct), 'Oct Cupola', 24);
testGap(tet, expandShape(tet), 'Tet Cupola', 12);
testGap(generateHypercube(3), generateHypercube(3), 'Cube Prism', 8);
testGap(generateHypercube(3), ico, 'Cube atop Ico', 24);

