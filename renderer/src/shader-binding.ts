export type ShaderBinding = BufferBinding | SamplerBinding | TextureBinding;

class ShaderBindingBase {
	name: string;
	wgslType: string;
	wgslStruct: string;
	visibility: GPUShaderStageFlags;

	constructor(
		name: string,
		wgslType: string,
		wgslStruct: string,
		visibility: GPUShaderStageFlags,
	) {
		this.name = name;
		this.wgslType = wgslType;
		this.wgslStruct = wgslStruct;
		this.visibility = visibility;
	}

	bindingType() { return ''; }

	toString(group: number, binding: number): string {
		var res = '';
		if (this.wgslStruct) res += this.wgslStruct.trim() + ';\n';
		res += `@group(${group}) @binding(${binding}) ${this.bindingType()} ${this.name}: ${this.wgslType};`;

		return res;
	}
}

function extractType(struct: string): string {
	const match = struct.match(/struct\s+(\w[0-9A-Za-z]*)/);

	if (match) return match[1];

	return '';
}

export class BufferBinding extends ShaderBindingBase {
	buffer: GPUBuffer | null;
	type: GPUBufferBindingType;

	constructor(
		name: string,
		buffer: GPUBuffer | null,
		{
			type = 'read-only-storage',
			visibility = GPUShaderStage.VERTEX,
			wgslType = 'array<f32>',
			wgslStruct = '',
		} : {
			type?: GPUBufferBindingType,
			visibility?: GPUShaderStageFlags,
			wgslType?: string,
			wgslStruct?: string,
		} = {
			type: 'read-only-storage',
			visibility: GPUShaderStage.VERTEX,
			wgslType: 'array<f32>',
			wgslStruct: '',
		}
	) {
		if (wgslStruct && wgslType === 'array<f32>') wgslType = extractType(wgslStruct);
		super(name, wgslType, wgslStruct, visibility);
		this.buffer = buffer;
		this.type = type;
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

	layoutEntry(binding: number): GPUBindGroupLayoutEntry {
		return {
			binding,
			visibility: this.visibility,
			buffer: { type: this.type },
		};
	}

	entry(binding: number): GPUBindGroupEntry {
		if (!this.buffer) throw new Error('attempting to bind empty buffer');
		return {
			binding,
			resource: {
				buffer: this.buffer
			}
		};
	}

	clone(newBuffer?: GPUBuffer): BufferBinding {
		return new BufferBinding(this.name, newBuffer ?? this.buffer, {
			type: this.type,
			visibility: this.visibility,
			wgslType: this.wgslType,
			wgslStruct: this.wgslStruct,
		});
	}
}

export class SamplerBinding extends ShaderBindingBase {
	sampler: GPUSampler;
	type: GPUSamplerBindingType;

	constructor(
		name: string,
		sampler: GPUSampler,
		type: GPUSamplerBindingType = 'filtering',
	) {
		super(name, 'sampler', '', GPUShaderStage.FRAGMENT);
		this.sampler = sampler;
		this.type = type;
	}

	bindingType() {
		return 'var';
	}

	layoutEntry(binding: number): GPUBindGroupLayoutEntry {
		return {
			binding,
			visibility: this.visibility,
			sampler: { type: this.type }
		};
	}

	entry(binding: number): GPUBindGroupEntry {
		return {
			binding,
			resource: this.sampler
		};
	}
}

export class TextureBinding extends ShaderBindingBase {
	texture: GPUTexture;

	constructor(
		name: string,
		texture: GPUTexture
	) {
		super(name, 'texture_2d<f32>', '', GPUShaderStage.FRAGMENT);
		this.texture = texture;
	}

	bindingType() {
		return 'var';
	}

	layoutEntry(binding: number): GPUBindGroupLayoutEntry {
		return {
			binding,
			visibility: this.visibility,
			texture: {}
		};
	}

	entry(binding: number): GPUBindGroupEntry {
		return {
			binding,
			resource: this.texture.createView(),
		};
	}
}
