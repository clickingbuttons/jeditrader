type ScalarType =
	| 'bool'
	| 'i32'
	| 'u32'
	| 'f32'
	| 'f16';

type StructMembers = {
	[k: string]: {
		offset: number,
		type: ScalarType
	}
};
export class View extends Uint8Array {
	members: StructMembers;

	constructor(size: number, members: StructMembers) {
		super(size);
		this.members = members;
	}
}
