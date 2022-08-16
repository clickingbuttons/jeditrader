#version 450

layout(location = 0) out vec3 fragColor;

vec3 vertices[] = vec3[](
	vec3(+0.1, +0.1, -0.1),
	vec3(-0.1, +0.1, -0.1),
	vec3(+0.1, -0.1, -0.1),
	vec3(-0.1, -0.1, -0.1),
	vec3(+0.1, +0.1, +0.1),
	vec3(-0.1, +0.1, +0.1),
	vec3(-0.1, -0.1, +0.1),
	vec3(+0.1, -0.1, +0.1)
);

vec3 colors[] = vec3[](
	vec3(1.0, 0.0, 0.0),
	vec3(0.0, 1.0, 0.0),
	vec3(0.0, 0.0, 1.0),
	vec3(1.0, 1.0, 1.0),
	vec3(1.0, 0.0, 0.0),
	vec3(0.0, 1.0, 0.0),
	vec3(0.0, 0.0, 1.0),
	vec3(1.0, 1.0, 1.0)
);

layout(push_constant) uniform Constants {
	mat4 mvp;
} constants;

void main() {
	gl_Position = constants.mvp * vec4(vertices[gl_VertexIndex], 1.0);
	gl_Position.y = -gl_Position.y;
	fragColor = colors[gl_VertexIndex];
}
