import { generateIcosahedron, expandShape } from './services/mathUtils.ts';

const baseShape = generateIcosahedron();
const expShape = expandShape(baseShape);

const dim = 4;

const scaleShape = (shape: any, targetEdgeLen: number) => {
    let avgEdgeLen = 0;
    if (shape.edges.length > 0) {
        let total = 0;
        let count = 0;
        shape.edges.forEach((e: any) => {
            const v1 = shape.vertices[e.source].coords;
            const v2 = shape.vertices[e.target].coords;
            let distSq = 0;
            for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
                const c1 = v1[i] !== undefined ? v1[i] : 0;
                const c2 = v2[i] !== undefined ? v2[i] : 0;
                distSq += Math.pow(c1 - c2, 2);
            }
            if (distSq > 0.001) {
                total += Math.sqrt(distSq);
                count++;
            }
        });
        if (count > 0) avgEdgeLen = total / count;
    }
    const scale = targetEdgeLen / (avgEdgeLen || 1);
    return shape.vertices.map((v: any) => ({
        coords: v.coords.map((c: number) => c * scale)
    }));
};

const v1 = scaleShape(baseShape, 1);
const v2 = scaleShape(expShape, 1);

let minSq = Infinity;
for (let i = 0; i < v1.length; i++) {
    for (let j = 0; j < v2.length; j++) {
        let distSq = 0;
        for (let d = 0; d < 3; d++) {
            const c1 = v1[i].coords[d] || 0;
            const c2 = v2[j].coords[d] || 0;
            distSq += Math.pow(c1 - c2, 2);
        }
        if (distSq < minSq) minSq = distSq;
    }
}

let height = 1.0;
if (minSq <= 1) height = Math.sqrt(1 - minSq);

const targetDist = minSq <= 1 ? 1.0 : Math.sqrt(minSq + height * height);

const newVertices = [];
v1.forEach((v:any) => {
    const c = [...v.coords];
    while (c.length < dim) c.push(0);
    c[dim - 1] = -height / 2;
    newVertices.push({ coords: c });
});
const offset = newVertices.length;
v2.forEach((v:any) => {
    const c = [...v.coords];
    while (c.length < dim) c.push(0);
    c[dim - 1] = height / 2;
    newVertices.push({ coords: c });
});

for (let tol of [0.05, 0.1, 0.2, 0.3]) {
    let count = 0;
    for (let i = 0; i < v1.length; i++) {
        for (let j = 0; j < v2.length; j++) {
            let distSq = 0;
            for (let d = 0; d < dim; d++) {
                distSq += Math.pow(newVertices[i].coords[d] - newVertices[j + offset].coords[d], 2);
            }
            const dist = Math.sqrt(distSq);
            if (Math.abs(dist - targetDist) < tol) {
                count++;
            }
        }
    }
    console.log("Tol:", tol, "Edges:", count);
}
