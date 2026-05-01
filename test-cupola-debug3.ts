import { generate120Cell, cupolizeShape, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const cell120 = generate120Cell();
const expanded = expandShape(cell120);

const result = generateSegmentochoron(cell120, expanded, 'test', 'test');

let nanFoundAt = '';
result.vertices.forEach((v, i) => {
    v.coords.forEach((c, j) => {
        if (!isFinite(c) && !nanFoundAt) nanFoundAt = `vertex ${i}, coord ${j}, val: ${c}`;
    });
});
console.log("NaN at:", nanFoundAt);

const resultShape = cupolizeShape(cell120);
let nanFoundCup = '';
resultShape.vertices.forEach((v, i) => {
    v.coords.forEach((c, j) => {
        if (!isFinite(c) && !nanFoundCup) nanFoundCup = `vertex ${i}, coord ${j}, val: ${c}`;
    });
});
console.log("Cupola NaN at:", nanFoundCup);

