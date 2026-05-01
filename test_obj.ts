import { generateHypercube, rectifyShape, Shape } from './services/mathUtils.ts';
import * as fs from 'fs';

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

const cube = generateHypercube(3);
const rr = rectifyShape(rectifyShape(cube));
const relaxed = relaxShape(rr, 500);

let obj = "";
relaxed.vertices.forEach(v => {
    obj += `v ${v.coords[0]} ${v.coords[1]} ${v.coords[2]}\n`;
});
relaxed.edges.forEach(e => {
    obj += `l ${e.source + 1} ${e.target + 1}\n`;
});

fs.writeFileSync('relaxed.obj', obj);
