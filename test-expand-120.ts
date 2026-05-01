import { generate120Cell, expandShape } from './services/mathUtils.ts';

const cell120 = generate120Cell();
const expanded = expandShape(cell120);

let foundNaN = false;
expanded.vertices.forEach(v => {
    v.coords.forEach(c => {
        if (!isFinite(c)) foundNaN = true;
    });
});
console.log("120-cell Expanded non-finite found:", foundNaN);
