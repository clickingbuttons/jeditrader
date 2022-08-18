#version 460 core

#include "axes.h"

layout(push_constant) uniform Constants {
	mat4 view;
	mat4 proj;
} view;

layout (location=0) out vec2 uv;

void main() {
	mat4 MVP = view.proj * view.view;

	int idx = indices[gl_VertexIndex];
	vec3 position = pos[idx] * gridSize;

	gl_Position = MVP * vec4(position, 1.0);
	uv = position.xy;
}
