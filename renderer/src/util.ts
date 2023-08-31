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

export function wgslType(arr: TypedArray) {
	const objectType = Object.prototype.toString.call(arr);
	switch (objectType) {
		case '[object Float32Array]':
			return 'f32';
		case '[object Int32Array]':
			return 'i32';
		case '[object Uint32Array]':
			return 'u32';
		default:
			throw new Error('unknown data type ' + objectType);
	}
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
	const res = device.createBuffer({
		label,
		size: align(data.byteLength, alignment),
		usage,
		mappedAtCreation: true
	});
	const objectType = Object.prototype.toString.call(data);
	switch (objectType) {
		case '[object Float64Array]':
			new Float64Array(res.getMappedRange()).set(data);
			break;
		case '[object Float32Array]':
			new Float32Array(res.getMappedRange()).set(data);
			break;
		case '[object Int32Array]':
			new Int32Array(res.getMappedRange()).set(data);
			break;
		case '[object Uint32Array]':
			new Uint32Array(res.getMappedRange()).set(data);
			break;
		case '[object Int16Array]':
			new Int16Array(res.getMappedRange()).set(data);
			break;
		case '[object Uint16Array]':
			new Uint16Array(res.getMappedRange()).set(data);
			break;
		case '[object Int8Array]':
			new Int8Array(res.getMappedRange()).set(data);
			break;
		case '[object Uint8Array]':
			new Uint8Array(res.getMappedRange()).set(data);
			break;
		default:
			throw new Error('unknown data type ' + objectType);
	}
	res.unmap()

	return res;
}

export function align(n: number, alignment: number) {
	return (n + alignment - 1) & ~(alignment - 1);
}