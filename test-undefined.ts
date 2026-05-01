import { generate120Cell } from './services/mathUtils.ts';

const cell120 = generate120Cell();
let hasUndefined = false;
cell120.vertices.forEach(v => {
    v.coords.forEach(c => {
        if (c === undefined) hasUndefined = true;
    });
});
console.log("120-cell has undefined:", hasUndefined);
