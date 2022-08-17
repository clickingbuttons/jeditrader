#version 450

layout(push_constant) uniform Constants {
	mat4 view;
	mat4 proj;
} view;

layout(location = 0) out vec3 nearPoint;
layout(location = 1) out vec3 farPoint;

// Grid position are in xy clipped space
vec3 gridPlane[6] = vec3[](
    vec3(1, 1, 0), vec3(-1, -1, 0), vec3(-1, 1, 0),
    vec3(-1, -1, 0), vec3(1, 1, 0), vec3(1, -1, 0)
);
// normal vertice projection
void main() {
    gl_Position = view.proj * view.view * vec4(gridPlane[gl_VertexIndex].xyz, 1.0);
}
