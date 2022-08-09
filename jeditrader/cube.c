#include "cube.h"
#include "chart.h"
#include "glutil.h"

#include <stdio.h>

#define MAX_CUBES_PER_CHART 1000000

static const GLchar* vertex_src =
 "#version 330 core\n"
 "layout (location = 0) in vec3 Position;\n"
 "layout (location = 1) in vec3 inColor;\n"
 "layout (location = 2) in mat4 model;\n"
 "uniform mat4 gWorld;\n"
 "out vec4 Color;\n"
 "void main()\n"
 "{\n"
 "  gl_Position = gWorld * model * vec4(Position, 1.0);\n"
 "  Color = vec4(inColor, 1.0);\n"
 "}\n";

static float vertices[] = {
 +1, +1, -1, -1, +1, -1, +1, -1, -1, -1, -1, -1,
 +1, +1, +1, -1, +1, +1, -1, -1, +1, +1, -1, +1,
};
static GLuint indices[] = {3, 2, 6, 7, 4, 2, 0, 3, 1, 6, 5, 4, 1, 0};

static void init_buffers(Window* window) {
	// position
	glGenBuffers(1, &window->cube.vbo);
	glBindBuffer(GL_ARRAY_BUFFER, window->cube.vbo);
	glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

	glGenVertexArrays(1, &window->cube.vao);
	glBindVertexArray(window->cube.vao);
	glEnableVertexAttribArray(0);
	glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), NULL);

	// model
	GLbitfield flags =
	 GL_MAP_WRITE_BIT | GL_MAP_PERSISTENT_BIT | GL_MAP_COHERENT_BIT;

	GLuint mbo;
	glGenBuffers(1, &mbo);
	glBindBuffer(GL_ARRAY_BUFFER, mbo);
	GLsizeiptr num_bytes = MAX_CUBES_PER_CHART * 16 * sizeof(float);
	// https://ferransole.wordpress.com/2014/06/08/persistent-mapped-buffers/
	glBufferStorage(GL_ARRAY_BUFFER, num_bytes, NULL, flags);
	window->chart->cube_transforms =
	 glMapBufferRange(GL_ARRAY_BUFFER, (GLintptr)NULL, num_bytes, flags);
	// Mat4s take 4 attribute arrays
	GLint mbo_loc = glGetAttribLocation(window->cube.program, "model");
	for (int i = 0; i < 3; i++) {
		GLuint loc = mbo_loc + i;
		glEnableVertexAttribArray(loc);
		void* offset = (void*)(4 * i * sizeof(float));
		glVertexAttribPointer(
		 loc, 4, GL_FLOAT, GL_FALSE, 4 * 4 * sizeof(float), offset);
		glVertexAttribDivisor(loc, 1);
	}

	// color
	GLuint cbo;
	glGenBuffers(1, &cbo);
	glBindBuffer(GL_ARRAY_BUFFER, cbo);
	glEnableVertexAttribArray(1);
	glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), NULL);
	glVertexAttribDivisor(1, 1);
	num_bytes = MAX_CUBES_PER_CHART * 3 * sizeof(float);
	glBufferStorage(GL_ARRAY_BUFFER, num_bytes, NULL, flags);
	window->chart->cube_colors =
	 glMapBufferRange(GL_ARRAY_BUFFER, (GLintptr)NULL, num_bytes, flags);

	// indices
	glGenBuffers(1, &window->cube.ebo);
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, window->cube.ebo);
	glBufferData(
	 GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);
}

void cube_init(Window* window) {
	init_program(&window->cube, vertex_src, DEFAULT_FRAGMENT_SRC);
	window->cube.uni_world =
	 glGetUniformLocation(window->cube.program, "gWorld");
	init_buffers(window);
}

void cube_render_frame(Window* window, u32 num_cubes) {
	glUseProgram(window->cube.program);
	glBindVertexArray(window->cube.vao);
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, window->cube.ebo);
	glUniformMatrix4fv(
	 window->cube.uni_world, 1, GL_FALSE, &window->chart->g_world.data[0][0]);

	glDrawElementsInstanced(
	 GL_TRIANGLE_STRIP,
	 sizeof(indices) / sizeof(GLuint),
	 GL_UNSIGNED_INT,
	 NULL,
	 num_cubes);
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);
}
