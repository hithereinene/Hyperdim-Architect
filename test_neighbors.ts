import { generate600Cell, generate120Cell } from './services/mathUtils.ts';

function checkNeighbors(shape: any) {
    const adj = new Map();
    shape.edges.forEach((e: any) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
    });

    const v = 0;
    console.log(shape.name, "neighbors of 0:", adj.get(v).length);
}

checkNeighbors(generate600Cell());
checkNeighbors(generate120Cell());
