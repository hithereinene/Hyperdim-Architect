function getSubsets(arr, k) {
    if (k === 1) return arr.map(x => [x]);
    const result = [];
    for (let i = 0; i <= arr.length - k; i++) {
        const first = arr[i];
        const rest = getSubsets(arr.slice(i + 1), k - 1);
        for (const r of rest) {
            result.push([first, ...r]);
        }
    }
    return result;
}

const facets = [
    [0, 1, 2, 3, 4],
    [1, 2, 3, 4, 5]
];

const dim = 5;
const lattice = {}; 
const faceMaps = {}; 

for (let k = 2; k < dim; k++) {
    lattice[k] = [];
    faceMaps[k] = new Map();
}

for (const facet of facets) {
    for (let k = 2; k < dim; k++) {
        const subsets = getSubsets(facet, k + 1);
        for (const sub of subsets) {
            sub.sort((a,b) => a-b);
            const key = sub.join(',');
            if (!faceMaps[k].has(key)) {
                faceMaps[k].set(key, lattice[k].length);
                lattice[k].push(sub);
            }
        }
    }
}

const outputLattice = { 2: lattice[2] };

for (let k = 3; k < dim; k++) {
    outputLattice[k] = [];
    for (const face of lattice[k]) {
        const subFaces = getSubsets(face, k);
        const subIndices = [];
        for (const sub of subFaces) {
            sub.sort((a,b) => a-b);
            const key = sub.join(',');
            subIndices.push(faceMaps[k-1].get(key));
        }
        outputLattice[k].push(subIndices);
    }
}

console.log(JSON.stringify(outputLattice, null, 2));
