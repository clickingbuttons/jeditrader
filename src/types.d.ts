declare module '*.wgsl' {
  const shader: string;
  export default shader;
}

declare module '*.css' {
	const content: {[className: string]: string}
	export default content
}
