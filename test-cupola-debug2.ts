import { generate120Cell, cupolizeShape } from './services/mathUtils.ts';

const cell120 = generate120Cell();
const cupola = cupolizeShape(cell120);

cupola.vertices.forEach((v, i) => {
    v.coords.forEach((c, j) => {
        if (!isFinite(c)) {
            console.log("Non-finite at vertex", i, "coord", j, "value", c);
        }
    });
});
