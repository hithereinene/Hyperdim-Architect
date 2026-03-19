import { generate600Cell } from './services/mathUtils.ts';

function checkPlanar(shape: any) {
    const adj = new Map();
    shape.edges.forEach((e: any) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
    });

    const v = 0;
    const neighbors = adj.get(v);
    
    let planar5 = 0;
    
    for (let i=0; i<neighbors.length; i++) {
        for (let j=i+1; j<neighbors.length; j++) {
            const n1 = neighbors[i];
            const n2 = neighbors[j];
            
            if (adj.get(n1).includes(n2)) continue; // length 3
            
            // check length 5
            let found5 = null;
            for (const nn1 of adj.get(n1)) {
                if (nn1 === v || neighbors.includes(nn1) || adj.get(n2).includes(nn1)) continue;
                for (const nn2 of adj.get(n2)) {
                    if (nn2 === v || neighbors.includes(nn2) || adj.get(n1).includes(nn2)) continue;
                    if (adj.get(nn1).includes(nn2)) {
                        found5 = [v, n1, nn1, nn2, n2];
                        break;
                    }
                }
                if (found5) break;
            }
            if (found5) {
                // check if found5 is planar
                const pts = found5.map(idx => shape.vertices[idx].coords);
                // vectors from v
                const v1 = pts[1].map((c, k) => c - pts[0][k]);
                const v2 = pts[2].map((c, k) => c - pts[0][k]);
                const v3 = pts[3].map((c, k) => c - pts[0][k]);
                const v4 = pts[4].map((c, k) => c - pts[0][k]);
                
                // check if v3 and v4 are in the span of v1 and v2
                // Since they are in 4D, we can check the rank of the matrix [v1, v2, v3, v4]
                // Or just compute the volume of the 4D parallelotope
                // Determinant of 4x4 matrix
                const det = 
                    v1[0] * (v2[1]*(v3[2]*v4[3] - v3[3]*v4[2]) - v2[2]*(v3[1]*v4[3] - v3[3]*v4[1]) + v2[3]*(v3[1]*v4[2] - v3[2]*v4[1]))
                  - v1[1] * (v2[0]*(v3[2]*v4[3] - v3[3]*v4[2]) - v2[2]*(v3[0]*v4[3] - v3[3]*v4[0]) + v2[3]*(v3[0]*v4[2] - v3[2]*v4[0]))
                  + v1[2] * (v2[0]*(v3[1]*v4[3] - v3[3]*v4[1]) - v2[1]*(v3[0]*v4[3] - v3[3]*v4[0]) + v2[3]*(v3[0]*v4[1] - v3[1]*v4[0]))
                  - v1[3] * (v2[0]*(v3[1]*v4[2] - v3[2]*v4[1]) - v2[1]*(v3[0]*v4[2] - v3[2]*v4[0]) + v2[2]*(v3[0]*v4[1] - v3[1]*v4[0]));
                
                if (Math.abs(det) < 1e-5) {
                    planar5++;
                }
            }
        }
    }
    console.log(shape.name, "planar chordless 5:", planar5);
}

checkPlanar(generate600Cell());
