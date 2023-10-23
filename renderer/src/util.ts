import { Vec3 } from '@jeditrader/linalg';

export const sampleCount = 4;
export const presentationFormat = navigator?.gpu?.getPreferredCanvasFormat();
export const depthFormat: GPUTextureFormat = 'depth32float';

type TypedArray = Float64Array | Float32Array | Int32Array | Uint32Array | Uint8Array;

export function createBuffer({
	device,
	usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
	data = new Float32Array(0),
	label,
}: {
	device: GPUDevice,
	data: TypedArray,
	usage?: GPUBufferUsageFlags,
	label?: string,
}): GPUBuffer {
	const alignment = usage & GPUBufferUsage.UNIFORM ? 16 : 1;
	const size = Math.max(data.byteLength, 16);
	const res = device.createBuffer({
		label,
		size: align(size, alignment),
		usage,
		mappedAtCreation: true
	});

	if (data instanceof Float32Array) new Float32Array(res.getMappedRange()).set(data);
	else if (data instanceof Int32Array) new Int32Array(res.getMappedRange()).set(data);
	else if (data instanceof Uint32Array) new Uint32Array(res.getMappedRange()).set(data);
	else if (data instanceof Uint8Array) new Uint8Array(res.getMappedRange()).set(data);
	else {
		const objectType = Object.prototype.toString.call(data);
		throw new Error('unknown data type ' + objectType);
	}
	res.unmap()

	return res;
}

export function align(n: number, alignment: number) {
	return (n + alignment - 1) & ~(alignment - 1);
}

function getConstructor<T extends TypedArray>(t: T) {
	if (t instanceof Float64Array) return Float64Array;
	if (t instanceof Float32Array) return Float32Array;
	if (t instanceof Int32Array) return Int32Array;
	if (t instanceof Uint32Array) return Uint32Array;
	if (t instanceof Uint8Array) return Uint8Array;

	const objectType = Object.prototype.toString.call(t);
	throw new Error('unknown data type ' + objectType);
}

export function concatTypedArrays<T extends TypedArray>(arrays: T[] | T): T {
	if (!Array.isArray(arrays)) arrays = [arrays];

	const Constructor = getConstructor(arrays[0]);
	const res = new Constructor(arrays.reduce((acc, cur) => acc + cur.length, 0)) as T;

	let o = 0;
	for (let i = 0; i < arrays.length; i++) {
		res.set(arrays[i], o);
		o += arrays[i].length;
	}

	return res;
}

function toF640(nums: Float64Array | number[]): Float32Array {
	const res = new Float32Array(nums.length * 2);
	for (let i = 0; i < nums.length; i++) {
		res[i * 2] = nums[i];
		res[i * 2 + 1] = nums[i] - Math.fround(nums[i]);
	}
	return res;
}

export function toF64(nums: Float64Array | number[] | Float64Array[]): Float32Array {
	if (nums[0] instanceof Float64Array) return toF640(concatTypedArrays(nums as Float64Array[]));

	return toF640(nums as Float64Array | number[]);
}

/// In-place
/// TODO: proper convex hull algo
export function sortCounterClockwise(v: Vec3[]) {
	const center = v.reduce((acc, cur) => acc.add(cur), new Vec3(0, 0, 0)).divScalar(v.length);
	v.sort((a, b) => {
		const a1 = Math.atan2(a.x - center.x, a.y - center.y);
		const a2 = Math.atan2(b.x - center.x, b.y - center.y);
		return a2 - a1;
	});
}

