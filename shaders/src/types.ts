import type { View } from './view.js';
//{
//	"g_view": {
//		scene: GPUBindGroupLayoutEntry;
//	},
//	"mesh": {
//		strides: GPUBindGroupLayoutEntry;
//		positions: GPUBindGroupLayoutEntry;
//		indices: GPUBindGroupLayoutEntry;
//		models: GPUBindGroupLayoutEntry;
//		colors: GPUBindGroupLayoutEntry;
//	}
//}
// Group order is sensitive thanks to GPUPipelineLayoutDescriptor
export type BindGroupLayouts = {
	[groupName: string]: {
		[bindingName: string]: GPUBindGroupLayoutEntry
			// & {
			// 	buffer: GPUBufferBindingLayout & {
			// 		createBuffer(device: GPUDevice, size: number): GPUBuffer,
			// 		createView(size: number): View,
			// 	}
			// };
			//	createBuffer(device: GPUDevice, size: number = 32): GPUBuffer {
			//		return device.createBuffer({
			//			size,
			//			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
			//		});
			//	},
			//	createView(size: number = 32): View {
			//		return new View(size, {
			//			backgroundColor: { offset: 0, type: 'u32' }
			//		});
			//	},
	}
};

//{
//	pos: GPUVertexBufferLayout,
//	color: GPUVertexBufferLayout,
//}
// Group order is sensitive thanks to GPUPipelineLayoutDescriptor
export type VertexLayouts = {
	[varName: string]: GPUVertexBufferLayout;
};

//{
//	resources: {
//		// NOTE: we can do this because these come from the WGSL symbol names which must be unique
//		scene: GPUBufferBinding;
//		strides: GPUBufferBinding;
//		positions: GPUBufferBinding;
//		indices: GPUBufferBinding;
//		models: GPUBufferBinding;
//		colors: GPUBufferBinding;
//	},
//	bindGroups: {
//		"g_view": GPUBindGroup,
//		"mesh": GPUBindGroup,
//	},
//}
export type Binding = {
	resources: {
		[bindingName: string]: GPUBindingResource;
	};
	bindGroups: {
		[groupName: string]: GPUBindGroup;
	};
	draw(pass: GPURenderPassEncoder, wireframe: boolean): void;
};

