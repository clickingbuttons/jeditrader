#version 450

layout(location = 0) out vec3 fragColor;

vec3 vertices[] = vec3[](
	vec3(+1, +1, -1),
	vec3(-1, +1, -1),
	vec3(+1, -1, -1),
	vec3(-1, -1, -1),
	vec3(+1, +1, +1),
	vec3(-1, +1, +1),
	vec3(-1, -1, +1),
	vec3(+1, -1, +1)
);

int indices[] = int[](3, 2, 6, 7, 4, 2, 0, 3, 1, 6, 5, 4, 1, 0);

layout(push_constant) uniform Constants {
	mat4 mvp;
} constants;

void main() {
	gl_Position = constants.mvp * vec4(vertices[indices[gl_VertexIndex]] * 0.1, 1.0);
}
