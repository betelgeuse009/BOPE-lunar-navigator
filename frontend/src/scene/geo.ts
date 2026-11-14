// Display geometry only: place a selenographic lat/lon on a sphere in three.js (Y-up) coordinates.
// +y = lunar north pole, +x = lon 0, lon increases eastward (toward -z), matching SphereGeometry's UV layout.
export function latLonToVec3(latDeg: number, lonDeg: number, r: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon)]
}
