import { generateHypercube, cupolizeShape } from './services/mathUtils.ts';

const cube = generateHypercube(3);
const cupola = cupolizeShape(cube);
let foundNaN = false;
cupola.vertices.forEach(v => {
    v.coords.forEach(c => {
        if (!isFinite(c)) {
            foundNaN = true;
            console.log("NaN/Infinity found in coordinates:", v.coords);
        }
    })
})
if (!foundNaN) {
    console.log("No non-finite coordinates found.");
}
