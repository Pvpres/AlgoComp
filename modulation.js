export const transformations = {
    transposition: transposition,
    inversion: inversion,
    retrograde: retrograde
};


const notes = new Map([['C', 0], ['C#', 1], ['D', 2], ['D#', 3], ['E', 4], ['F', 5], ['F#', 6], ['G', 7], ['G#', 8], ['A', 9], ['A#', 10], ['B', 11]]);

function transposition(arr, interval) {
    let ans = []
    for (let i = 0; i < arr.length; i++) {
        ans[i] = (((arr[i] + interval) % 12) + 12) % 12;
    }
    return ans
}

function inversion(arr, pivot = 0) {
    let ans = []
    for (let i = 0; i < arr.length; i++) {
        ans[i] = (((pivot - arr[i]) % 12) + 12) % 12;
    }
    return ans;
}

function retrograde(arr) {
    return arr.reverse();
}