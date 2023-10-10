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
		[bindingName: string]: GPUBindGroupLayoutEntry;
	}
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

