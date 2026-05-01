const e8_roots = [];
// 112 roots
for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
        for (let s1 of [-1, 1]) {
            for (let s2 of [-1, 1]) {
                const v = [0, 0, 0, 0, 0, 0, 0, 0];
                v[i] = s1;
                v[j] = s2;
                e8_roots.push(v);
            }
        }
    }
}
// 128 roots
for (let i = 0; i < 256; i++) {
    let bits = 0;
    for (let k = 0; k < 8; k++) if ((i >> k) & 1) bits++;
    if (bits % 2 === 0) {
        const v = [];
        for (let k = 0; k < 8; k++) v.push(((i >> k) & 1) ? -0.5 : 0.5);
        e8_roots.push(v);
    }
}

const e6_roots = e8_roots.filter(v => v[0] === v[1] && v[1] === v[2]);
console.log("E6 roots:", e6_roots.length);

const groups = {};
for (const v of e8_roots) {
    const key = `${v[0] - v[1]},${v[0] + v[1] - 2 * v[2]}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
}

for (const key in groups) {
    console.log(`Group ${key}: ${groups[key].length} vertices`);
}
