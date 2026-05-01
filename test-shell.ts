import { generateIcosahedron, expandShape, generateHypercube, rectifyShape } from './services/mathUtils.ts';

const testConnections = (name, s1, s2, h=1.0) => {
    console.log(`\n--- ${name} ---`);
    let minDists = [];
    let crossEdges = 0;
    
    // Check gap sizes
    for (let i = 0; i < s1.vertices.length; i++) {
        let dists = [];
        for (let j = 0; j < s2.vertices.length; j++) {
            let distSq = 0;
            for(let d=0; d<3; d++) distSq += Math.pow((s1.vertices[i].coords[d]||0) - (s2.vertices[j].coords[d]||0), 2);
            distSq += h*h;
            dists.push(Math.sqrt(distSq));
        }
        dists.sort((a,b) => a-b);
        const minDist = dists[0];
        
        let connected = dists.filter(d => d < minDist + 0.15).length;
        crossEdges += connected;
        // console.log(`v${i} gap:`, dists[connected] - dists[connected-1], ' connected:', connected);
    }
    console.log(`Total cross edges: ${crossEdges}`);
}

const ico = generateIcosahedron();
const eico = expandShape(generateIcosahedron());
testConnections('Icosahedron Cupola', ico, eico);

const cube = generateHypercube(3);
testConnections('Cube Prism', cube, cube);

testConnections('Cube atop Icosahedron', cube, ico);

testConnections('Cube atop Cuboctahedron', cube, rectifyShape(generateHypercube(3)));

