export class ShaderBinding {
	name: string;
	type: GPUBufferBindingType;
	visibility: GPUShaderStageFlags;
	buffer: GPUBuffer;
	wgslType: string;
	wgslStruct: string;

	constructor({
		name,
		type = 'read-only-storage',
		visibility = GPUShaderStage.VERTEX,
		buffer,
		wgslType = 'array<f32>',
		wgslStruct = '',
	} : {
		name: string,
		type?: GPUBufferBindingType,
		visibility?: GPUShaderStageFlags,
		buffer: GPUBuffer,
		vertStride?: number,
		instanceStride?: number,
		wgslType?: string,
		wgslStruct?: string,
	}) {
		this.name = name;
		this.type = type;
		this.visibility = visibility;
		this.buffer = buffer;
		this.wgslType = wgslType;
		this.wgslStruct = wgslStruct;
	}

	bindingType(): string {
		switch (this.type) {
		case 'uniform':
			return 'var<uniform>';
		case 'storage':
			return 'var<storage>';
		case 'read-only-storage':
			return 'var<storage, read>';
		default:
			throw new Error('unknown type ' + this.type);
		}
	}

	toString(group: number, binding: number): string {
		var res = '';
		if (this.wgslStruct) res += this.wgslStruct.trim() + ';\n';
		res += `@group(${group}) @binding(${binding}) ${this.bindingType()} ${this.name}: ${this.wgslType};`;

		return res;
	}

	layoutEntry(binding: number): GPUBindGroupLayoutEntry {
		return {
			binding,
			visibility: this.visibility,
			buffer: { type: this.type },
		};
	}

	entry(binding: number): GPUBindGroupEntry {
		return {
			binding,
			resource: {
				buffer: this.buffer
			}
		};
	}
}
