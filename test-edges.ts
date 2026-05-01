import { generateIcosahedron, cupolizeShape } from './services/mathUtils.ts';

const ico = generateIcosahedron();
const cupola = cupolizeShape(ico);

const topVCount = ico.vertices.length;
const baseVCount = cupola.vertices.length - topVCount;

let counts = new Array(topVCount).fill(0);
let baseCounts = new Array(baseVCount).fill(0);

cupola.edges.forEach(e => {
    if (e.source < topVCount && e.target >= topVCount) {
        counts[e.source]++;
        baseCounts[e.target - topVCount]++;
    }
});
console.log('per top V:', counts);
console.log('per base V:', baseCounts.filter(v => v > 0).length, 'with connections, max:', Math.max(...baseCounts));
