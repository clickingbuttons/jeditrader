#version 450

layout(location = 0) in vec3 nearPoint;
layout(location = 1) in vec3 farPoint;

layout(push_constant) uniform Constants {
	mat4 fragView;
	mat4 fragProj;
} constants;

layout(location = 0) out vec4 outColor;

void main() {
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
}
