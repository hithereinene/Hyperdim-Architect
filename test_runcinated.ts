import { generate120Cell, generate600Cell } from './services/mathUtils.ts';

const c120 = generate120Cell();
const c600 = generate600Cell();

console.log("120-cell vertices:", c120.vertices.length);
console.log("600-cell vertices:", c600.vertices.length);

// Find edge length of 120-cell
let L = 1000;
for(let i=1; i<c120.vertices.length; i++) {
    let d = 0;
    for(let j=0; j<4; j++) {
        d += Math.pow(c120.vertices[0].coords[j] - c120.vertices[i].coords[j], 2);
    }
    if(d > 0.001 && d < L) L = d;
}
L = Math.sqrt(L);
console.log("120-cell edge length L:", L);

// Find edge length of 600-cell
let L600 = 1000;
for(let i=1; i<c600.vertices.length; i++) {
    let d = 0;
    for(let j=0; j<4; j++) {
        d += Math.pow(c600.vertices[0].coords[j] - c600.vertices[i].coords[j], 2);
    }
    if(d > 0.001 && d < L600) L600 = d;
}
L600 = Math.sqrt(L600);
console.log("600-cell edge length L600:", L600);

// For a vertex in 120-cell, find the 4 closest 600-cell vertices (centers of the 4 dodecahedra)
// Wait, the 600-cell vertices are the centers of the dodecahedra.
// A vertex in 120-cell is shared by 4 dodecahedra.
// So for a vertex V in 120-cell, the 4 closest 600-cell vertices should be at the same distance.
const v120 = c120.vertices[0].coords;
const dists = c600.vertices.map((v, i) => {
    let d = 0;
    for(let j=0; j<4; j++) d += Math.pow(v.coords[j] - v120[j], 2);
    return {i, d: Math.sqrt(d)};
});
dists.sort((a, b) => a.d - b.d);
console.log("4 closest 600-cell vertices to a 120-cell vertex:");
for(let i=0; i<4; i++) {
    console.log(dists[i].d);
}

// Distance between two of these 4 centers
const c1 = c600.vertices[dists[0].i].coords;
const c2 = c600.vertices[dists[1].i].coords;
let dc = 0;
for(let j=0; j<4; j++) dc += Math.pow(c1[j] - c2[j], 2);
dc = Math.sqrt(dc);
console.log("Distance between centers (should be L600):", dc);

// Calculate s
// Wait, the new vertex is V_new = (1-s) V120 + s C
// The distance between V_new1 and V_new2 is | (1-s) V120 + s C1 - ((1-s) V120 + s C2) | = s |C1 - C2| = s * dc
// The edge length of the shrunken dodecahedron is (1-s) L
// So (1-s) L = s * dc  =>  L - s L = s dc  =>  s = L / (L + dc)
const s = L / (L + dc);
console.log("Scale factor s:", s);
