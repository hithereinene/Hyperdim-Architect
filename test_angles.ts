import { generate600Cell, generate120Cell } from './services/mathUtils.ts';

function checkAngles(shape: any) {
    const adj = new Map();
    shape.edges.forEach((e: any) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
    });

    const v = 0;
    const neighbors = adj.get(v);
    const p0 = shape.vertices[v].coords;
    const angles = new Set();
    
    for (let i=0; i<neighbors.length; i++) {
        for (let j=i+1; j<neighbors.length; j++) {
            const p1 = shape.vertices[neighbors[i]].coords;
            const p2 = shape.vertices[neighbors[j]].coords;
            
            let dot = 0;
            let mag1 = 0;
            let mag2 = 0;
            for (let k=0; k<p0.length; k++) {
                const v1 = p1[k] - p0[k];
                const v2 = p2[k] - p0[k];
                dot += v1 * v2;
                mag1 += v1 * v1;
                mag2 += v2 * v2;
            }
            let cosTheta = dot / Math.sqrt(mag1 * mag2);
            // round to 3 decimal places
            cosTheta = Math.round(cosTheta * 1000) / 1000;
            angles.add(cosTheta);
        }
    }
    console.log(shape.name, "cos(theta) values:", Array.from(angles));
}

checkAngles(generate600Cell());
checkAngles(generate120Cell());
