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
