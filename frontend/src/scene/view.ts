// Shared drawing constants of the 3D view. The scene unit is one Moon radius.

// Opening camera position.
export const HOME: [number, number, number] = [1.2, -3.0, 1.45]

// Body radii from the SPICE kernel pck00011.tpc, as used by the analysis (docs/PARAMETERS.md).
export const R_MOON_KM = 1737.4
export const R_EARTH_KM = 6378.1366
export const R_SUN_KM = 695_700
// Used only when the analysis server is off and no distance is available: the mean Earth-Moon distance and 1 AU.
export const TYPICAL_EARTH_KM = 384_400
export const TYPICAL_SUN_KM = 149_597_870.7
// Stars sit beyond the Sun (about 86 000 Moon radii away); the camera sees out to FAR.
export const STAR_RADIUS = 300_000
export const FAR = 700_000
