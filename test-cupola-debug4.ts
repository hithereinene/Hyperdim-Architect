import { generate120Cell, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const cell120 = generate120Cell();
const expanded = expandShape(cell120);

const shape1 = cell120;
const shape2 = expanded;
const dim = Math.max(shape1.dimension || 0, shape2.dimension || 0) + 1;

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
    
    if (avgEdgeLen === 0 || isNaN(avgEdgeLen)) {
        avgEdgeLen = 1;
    }

    const scale = targetEdgeLen / avgEdgeLen;
    console.log(`avgEdge len: ${avgEdgeLen}, scale: ${scale}`);

    return shape.vertices.map((v: any) => ({
        coords: v.coords.map((c: number) => c * scale)
    }));
};

const v1 = scaleShape(shape1, 1);
const v2 = scaleShape(shape2, 1);

console.log("v1[0] after scale:", v1[0]);
console.log("v2[0] after scale:", v2[0]);
