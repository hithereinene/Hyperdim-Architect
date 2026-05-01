import { generate120Cell, cupolizeShape } from './services/mathUtils.ts';

const cell120 = generate120Cell();
const cupola = cupolizeShape(cell120);

let foundNaN = false;
cupola.vertices.forEach(v => {
    v.coords.forEach(c => {
        if (!isFinite(c)) foundNaN = true;
    });
});
console.log("120-cell Cupola non-finite found:", foundNaN);
