import { generateHypercube, runcinateShape, Shape } from './services/mathUtils.ts';

function relaxShape(shape: Shape, iterations = 200): Shape {
    const vertices = shape.vertices.map(v => ({ coords: [...v.coords] }));
    const edges = shape.edges;
    
    for (let iter = 0; iter < iterations; iter++) {
        let avgLen = 0;
        const lengths = edges.map(e => {
            const p1 = vertices[e.source].coords;
            const p2 = vertices[e.target].coords;
            let distSq = 0;
            for (let i = 0; i < p1.length; i++) distSq += (p1[i] - p2[i]) ** 2;
            const dist = Math.sqrt(distSq);
            avgLen += dist;
            return dist;
        });
        avgLen /= edges.length;
        
        const forces = vertices.map(v => new Array(v.coords.length).fill(0));
        
        edges.forEach((e, i) => {
            const p1 = vertices[e.source].coords;
            const p2 = vertices[e.target].coords;
            const dist = lengths[i];
            if (dist === 0) return;
            
            const diff = (dist - avgLen) / dist * 0.5;
            
            for (let d = 0; d < p1.length; d++) {
                const f = (p2[d] - p1[d]) * diff;
                forces[e.source][d] += f;
                forces[e.target][d] -= f;
            }
        });
        
        vertices.forEach((v, i) => {
            for (let d = 0; d < v.coords.length; d++) {
                v.coords[d] += forces[i][d] * 0.1;
            }
        });
    }
    
    return { ...shape, vertices };
}

const tess = generateHypercube(4);
const runc = runcinateShape(tess);

console.log("Before relax:");
let l1 = Math.sqrt((runc.vertices[runc.edges[0].source].coords[0] - runc.vertices[runc.edges[0].target].coords[0])**2 + (runc.vertices[runc.edges[0].source].coords[1] - runc.vertices[runc.edges[0].target].coords[1])**2 + (runc.vertices[runc.edges[0].source].coords[2] - runc.vertices[runc.edges[0].target].coords[2])**2);
let l2 = Math.sqrt((runc.vertices[runc.edges[1].source].coords[0] - runc.vertices[runc.edges[1].target].coords[0])**2 + (runc.vertices[runc.edges[1].source].coords[1] - runc.vertices[runc.edges[1].target].coords[1])**2 + (runc.vertices[runc.edges[1].source].coords[2] - runc.vertices[runc.edges[1].target].coords[2])**2);
console.log("Edge 0 length:", l1);
console.log("Edge 1 length:", l2);

const relaxed = relaxShape(runc, 500);

console.log("After relax:");
l1 = Math.sqrt((relaxed.vertices[relaxed.edges[0].source].coords[0] - relaxed.vertices[relaxed.edges[0].target].coords[0])**2 + (relaxed.vertices[relaxed.edges[0].source].coords[1] - relaxed.vertices[relaxed.edges[0].target].coords[1])**2 + (relaxed.vertices[relaxed.edges[0].source].coords[2] - relaxed.vertices[relaxed.edges[0].target].coords[2])**2);
l2 = Math.sqrt((relaxed.vertices[relaxed.edges[1].source].coords[0] - relaxed.vertices[relaxed.edges[1].target].coords[0])**2 + (relaxed.vertices[relaxed.edges[1].source].coords[1] - relaxed.vertices[relaxed.edges[1].target].coords[1])**2 + (relaxed.vertices[relaxed.edges[1].source].coords[2] - relaxed.vertices[relaxed.edges[1].target].coords[2])**2);
console.log("Edge 0 length:", l1);
console.log("Edge 1 length:", l2);
