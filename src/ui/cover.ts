// White text sits on these (every stop is at least 4.5:1 against white), so a cover reads the same in all four themes.
export const COVERS = [['#352AAB', '#4F41DC'], ['#065F46', '#047857'], ['#7C2D12', '#B45309'], ['#6B21A8', '#7E22CE'], ['#9D174D', '#BE185D'], ['#155E75', '#0E7490']];
export const coverOf = (i: number) => { const [a, b] = COVERS[((i % COVERS.length) + COVERS.length) % COVERS.length]; return `linear-gradient(135deg, ${a}, ${b})`; };
