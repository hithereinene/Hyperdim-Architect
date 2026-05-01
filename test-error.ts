import { generateHypercube, cupolizeShape, runcinateShape, expandShape, generateSimplex } from './services/mathUtils.ts';

try {
    const cube = generateHypercube(3);
    const c1 = cupolizeShape(cube);
    console.log("C1 OK");
    cupolizeShape(c1);
    console.log("C2 OK");
} catch (e) {
    console.error(e);
}
