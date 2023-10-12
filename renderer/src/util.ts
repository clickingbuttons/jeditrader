export type Range<T> = {
	min: T;
	max: T;
}

export async function compileShader(device: GPUDevice, code: string) {
	var shaderModule = device.createShaderModule({ code });
	var compilationInfo = await shaderModule.getCompilationInfo();
	if (compilationInfo.messages.length > 0) {
		var hadError = false;
		var errText = '';
		for (var i = 0; i < compilationInfo.messages.length; ++i) {
			var msg = compilationInfo.messages[i];
			if (msg.type === 'error') {
				errText += `\n${msg.lineNum}:${msg.linePos} - ${msg.message}`;
				hadError = true;
			}
		}
		if (hadError) throw new Error(`Shader failed to compile: ${errText}`);
	}

	return shaderModule;
}

export const sampleCount = 4;
export const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
export const depthFormat: GPUTextureFormat = 'depth32float';

interface TypedArray {
	readonly BYTES_PER_ELEMENT: number;
	readonly buffer: ArrayBufferLike;
	readonly byteLength: number;
	readonly length: number;
	[index: number]: number;
}

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
	switch (data.constructor) {
		case Float64Array:
			new Float64Array(res.getMappedRange()).set(data);
			break;
		case Float32Array:
			new Float32Array(res.getMappedRange()).set(data);
			break;
		case Int32Array:
			new Int32Array(res.getMappedRange()).set(data);
			break;
		case Uint32Array:
			new Uint32Array(res.getMappedRange()).set(data);
			break;
		case Int16Array:
			new Int16Array(res.getMappedRange()).set(data);
			break;
		case Uint16Array:
			new Uint16Array(res.getMappedRange()).set(data);
			break;
		case Int8Array:
			new Int8Array(res.getMappedRange()).set(data);
			break;
		case Uint8Array:
			new Uint8Array(res.getMappedRange()).set(data);
			break;
		default:
			const objectType = Object.prototype.toString.call(data);
			throw new Error('unknown data type ' + objectType);
	}
	res.unmap()

	return res;
}

export function align(n: number, alignment: number) {
	return (n + alignment - 1) & ~(alignment - 1);
}

export function toF64(nums: Float64Array | number[]): Float32Array {
	const res = new Float32Array(nums.length * 2);
	for (let i = 0; i < nums.length; i++) {
		res[i * 2] = nums[i];
		res[i * 2 + 1] = nums[i] - Math.fround(nums[i]);
	}
	return res;
}

