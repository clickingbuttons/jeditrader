export function degToRad(deg: number): number {
	return deg * Math.PI / 180;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

