export interface Mesh {
	name: string;
	vertices: {
		data: any;
		layout: Iterable<GPUVertexBufferLayout | null>
	},
	indices: Int32Array,
};

export default {
	name: 'cube',
	vertices: {
		data: new Float32Array([
			+1, +1, -1,
			-1, +1, -1,
			+1, -1, -1,
			-1, -1, -1,
			+1, +1, +1,
			-1, +1, +1,
			-1, -1, +1,
			+1, -1, +1
		]),
		layout: [{
			arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
			attributes: [
				{
					shaderLocation: 0,
					offset: 0,
					format: 'float32x3',
				},
			]
		}],
	},
	indices: new Int32Array([
		3, 2,
		6, 7,
		4, 2,
		0, 3,
		1, 6,
		5, 4,
		1, 0
	])
} as Mesh;
