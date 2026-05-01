import { dualShape as dualizeShape, addNoise, ch, Shape, Vertex } from './services/mathUtils.ts';

const generateStepPrism = (p: number, q: number): Shape => {
    const pts: number[][] = [];
    for (let k = 0; k < p; k++) {
        const theta1 = (k / p) * Math.PI * 2;
        const theta2 = ((k * q) / p) * Math.PI * 2;
        pts.push([Math.cos(theta1), Math.sin(theta1), Math.cos(theta2), Math.sin(theta2)]);
    }

    const vertices = pts.map(c => ({ coords: c }));
    
    return {
        id: `stepprism`,
        name: `Step Prism`,
        dimension: 4,
        vertices,
        edges: []
    }
}

const sp = generateStepPrism(13, 5);
const gyro = dualizeShape(sp);
console.log(`Gyrochoron verts: ${gyro.vertices.length}, edges: ${gyro.edges.length}`);
