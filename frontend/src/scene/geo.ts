// Display geometry only: place a selenographic lat/lon on a sphere in three.js (Y-up) coordinates.
// +y = lunar north pole, +x = lon 0, lon increases eastward (toward -z), matching SphereGeometry's UV layout.
export function latLonToVec3(latDeg: number, lonDeg: number, r: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon)]
}

// Texture coordinates on the south polar cap image (azimuthal equidistant, made by scripts/textures.py):
// pole at the centre, latitude -90+capDeg on the unit circle's edge, lon 0 toward +u, lon 90E toward +v.
export function polarCapUV(latDeg: number, lonDeg: number, capDeg: number): [number, number] {
  const rho = (90 + latDeg) / capDeg
  const lon = (lonDeg * Math.PI) / 180
  return [0.5 + 0.5 * rho * Math.cos(lon), 0.5 + 0.5 * rho * Math.sin(lon)]
}
