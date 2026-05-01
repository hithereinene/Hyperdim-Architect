import { generate120Cell, generate600Cell } from './services/mathUtils.ts';

const c120 = generate120Cell();
const c600 = generate600Cell();

let L = 1000;
for(let i=1; i<c120.vertices.length; i++) {
    let d = 0;
    for(let j=0; j<4; j++) d += Math.pow(c120.vertices[0].coords[j] - c120.vertices[i].coords[j], 2);
    if(d > 0.001 && d < L) L = d;
}
L = Math.sqrt(L);

let L600 = 1000;
for(let i=1; i<c600.vertices.length; i++) {
    let d = 0;
    for(let j=0; j<4; j++) d += Math.pow(c600.vertices[0].coords[j] - c600.vertices[i].coords[j], 2);
    if(d > 0.001 && d < L600) L600 = d;
}
L600 = Math.sqrt(L600);

const s = L / (L + L600);
const newEdgeLength = (1 - s) * L;
console.log("New edge length:", newEdgeLength);

const newVertices = [];
for(let i=0; i<c120.vertices.length; i++) {
    const v120 = c120.vertices[i].coords;
    const dists = c600.vertices.map((v, idx) => {
        let d = 0;
        for(let j=0; j<4; j++) d += Math.pow(v.coords[j] - v120[j], 2);
        return {idx, d: Math.sqrt(d)};
    });
    dists.sort((a, b) => a.d - b.d);
    
    for(let k=0; k<4; k++) {
        const c = c600.vertices[dists[k].idx].coords;
        const vNew = [];
        for(let j=0; j<4; j++) {
            vNew.push((1 - s) * v120[j] + s * c[j]);
        }
        newVertices.push({coords: [...vNew, 0, 0, 0, 0, 0, 0]});
    }
}

console.log("Generated vertices:", newVertices.length);

// Remove 4 vertices (the 4 vertices generated from the first 120-cell vertex)
newVertices.splice(0, 4);
console.log("After diminishing:", newVertices.length);

// Let's check the distance between some vertices to confirm the edge length
let d1 = 0;
for(let j=0; j<4; j++) d1 += Math.pow(newVertices[0].coords[j] - newVertices[1].coords[j], 2);
console.log("Distance between 0 and 1:", Math.sqrt(d1));

// We will use connectVerticesByDistance with newEdgeLength
