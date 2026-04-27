import { transformations } from "./modulation.js";
let currentSet = [0, 4, 7, 11];
const composition = [];

//these are rules to prevent doing the same operation twice in a row
const rules = {
    transpose: ['inversion', 'retrograde'],
    inversion: ['transpose', 'retrograde'],
    retrograde: ['transpose', 'inversion']
};
let lastTransform = null;

function generateNextSection() {
    let transformName = pickTransformation();

    if (transformName === 'transpose') {
        let randomInterval = (Math.floor(Math.random() * 11) + 1) * (Math.random() < 0.5 ? 1 : -1);
        currentSet = transformations.transposition(currentSet, randomInterval);
        console.log(`Applied Transposition (T${randomInterval})`);
    } else if (transformName === 'retrograde') {
        currentSet = transformations.retrograde(currentSet);
        console.log(`Applied Retrograde`);
    } else if (transformName === 'inversion') {
        currentSet = transformations.inversion(currentSet);
        console.log(`Applied Inversion`);
    }

    return currentSet;
}

function pickTransformation() {
    let chosenName;
    while (true) {
        const num = Math.floor(Math.random() * 10);
        if (num < 5) {
            chosenName = 'transpose';
        } else if (num < 8) {
            chosenName = 'retrograde';
        } else {
            chosenName = 'inversion';
        }
        if (!lastTransform || rules[lastTransform].includes(chosenName)) {
            break;
        }
    }

    lastTransform = chosenName;
    return chosenName;
}

console.log(`Initial Seed: [${currentSet}]`);

for (let i = 0; i < 10; i++) {
    const newSet = generateNextSection();
    composition.push(newSet);
    console.log(`Resulting Set ${i + 1}: [${newSet}]\n`);
}
