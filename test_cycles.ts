import { generate600Cell, generate120Cell } from './services/mathUtils.ts';

function checkChordlessCycles(shape: any) {
    const adj = new Map();
    shape.edges.forEach((e: any) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
    });

    const v = 0;
    const neighbors = adj.get(v);
    
    let chordless4 = 0;
    let chordless5 = 0;
    
    for (let i=0; i<neighbors.length; i++) {
        for (let j=i+1; j<neighbors.length; j++) {
            const n1 = neighbors[i];
            const n2 = neighbors[j];
            
            if (adj.get(n1).includes(n2)) continue; // length 3
            
            // check length 4
            let found4 = false;
            for (const nn of adj.get(n1)) {
                if (nn !== v && !neighbors.includes(nn) && adj.get(n2).includes(nn)) {
                    found4 = true;
                    break;
                }
            }
            if (found4) {
                chordless4++;
                continue;
            }
            
            // check length 5
            let found5 = false;
            for (const nn1 of adj.get(n1)) {
                if (nn1 === v || neighbors.includes(nn1) || adj.get(n2).includes(nn1)) continue;
                for (const nn2 of adj.get(n2)) {
                    if (nn2 === v || neighbors.includes(nn2) || adj.get(n1).includes(nn2)) continue;
                    if (adj.get(nn1).includes(nn2)) {
                        found5 = true;
                        break;
                    }
                }
                if (found5) break;
            }
            if (found5) {
                chordless5++;
            }
        }
    }
    console.log(shape.name, "chordless 4:", chordless4, "chordless 5:", chordless5);
}

checkChordlessCycles(generate600Cell());
checkChordlessCycles(generate120Cell());
