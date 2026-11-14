// Shared drawing constants of the 3D view.

// Opening camera position.
export const HOME: [number, number, number] = [1.2, -3.0, 1.45]

// Drawing choices, in Moon radii. The directions are real (sub-solar and sub-Earth points at the landing time);
// the sizes and distances are NOT to scale, or neither body would fit in the view. Real values, in Moon radii
// (1737.4 km): Earth radius 3.67 at about 221 away; Sun radius 400 at about 86 100 away. Stated on screen.
export const SKY = { earthDist: 6, earthRadius: 0.45, sunDist: 10.5, sunRadius: 0.8 }
