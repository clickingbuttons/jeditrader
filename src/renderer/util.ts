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

interface TypedArray {
	readonly BYTES_PER_ELEMENT: number;
	readonly buffer: ArrayBufferLike;
	readonly byteLength: number;
	readonly length: number;
	[index: number]: number;
}

export function createBuffer({
	device,
	usage = GPUBufferUsage.VERTEX,
	data,
	arrayTag = 'f32',
	label,
}: {
	device: GPUDevice,
	data: TypedArray,
	arrayTag?: 'f64' | 'f32' | 'i32' | 'u32' | 'i16' | 'u16' | 'i8' | 'u8',
	usage?: GPUBufferUsageFlags,
	label?: string,
}): GPUBuffer {
	const res = device.createBuffer({
		label,
		size: data.byteLength,
		usage,
		mappedAtCreation: true
	});
	switch (arrayTag) {
		case 'f64':
			new Float64Array(res.getMappedRange()).set(data);
			break;
		case 'f32':
			new Float32Array(res.getMappedRange()).set(data);
			break;
		case 'i32':
			new Int32Array(res.getMappedRange()).set(data);
			break;
		case 'u32':
			new Uint32Array(res.getMappedRange()).set(data);
			break;
		case 'i16':
			new Int16Array(res.getMappedRange()).set(data);
			break;
		case 'u16':
			new Uint16Array(res.getMappedRange()).set(data);
			break;
		case 'i8':
			new Int8Array(res.getMappedRange()).set(data);
			break;
		case 'u8':
			new Uint8Array(res.getMappedRange()).set(data);
			break;
		default:
			throw new Error('unknown array tag ' + arrayTag);
	}
	res.unmap()

	return res;
}

export function createBuffer4(
	device: GPUDevice,
	data: TypedArray,
	label?: string
): GPUBuffer {
	const res = device.createBuffer({
		label,
		size: data.byteLength,
		usage: GPUBufferUsage.VERTEX,
		mappedAtCreation: true
	});
	new Int32Array(res.getMappedRange()).set(data);
	res.unmap()

	return res;
}

export interface Range {
	min: number;
	max: number;
}

export interface Bounds {
	x: Range;
	y: Range;
	z: Range;
}

export function align(n: number, alignment: number) {
	return (n + alignment - 1) & ~(alignment - 1);
}
