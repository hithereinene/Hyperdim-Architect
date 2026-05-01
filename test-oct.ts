import { generateOctahedron, expandShape } from './services/mathUtils.ts';
const oct = generateOctahedron();
const eoct = expandShape(generateOctahedron());
for(let i=0; i<oct.vertices.length; i++) {
    let dists = [];
    for(let j=0; j<eoct.vertices.length; j++) {
        let distSq = 0;
        for(let d=0; d<3; d++) distSq += Math.pow((oct.vertices[i].coords[d]||0) - (eoct.vertices[j].coords[d]||0), 2);
        dists.push(Math.sqrt(distSq+1.0));
    }
    dists.sort((a,b)=>a-b);
    console.log(`Oct v${i}:`, dists.slice(0, 6).map(d=>d.toFixed(3)).join(', '));
}
