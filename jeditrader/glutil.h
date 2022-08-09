#include "window.h"

#include <GL/glew.h>

static const GLchar* DEFAULT_FRAGMENT_SRC = "#version 330 core\n"
											"in vec4 Color;\n"
											"out vec4 outColor;\n"
											"void main()\n"
											"{\n"
											"  outColor = Color;\n"
											"}\n";

static void init_program(
 GLContext* context,
 const GLchar* vertex_src,
 const GLchar* fragment_src) {
	GLuint vertex_shader = glCreateShader(GL_VERTEX_SHADER);
	glShaderSource(vertex_shader, 1, &vertex_src, 0);
	glCompileShader(vertex_shader);

	GLuint fragment_shader = glCreateShader(GL_FRAGMENT_SHADER);
	glShaderSource(fragment_shader, 1, &fragment_src, 0);
	glCompileShader(fragment_shader);

	context->program = glCreateProgram();
	glAttachShader(context->program, vertex_shader);
	glAttachShader(context->program, fragment_shader);
	glLinkProgram(context->program);
	int params = -1;
	glGetProgramiv(context->program, GL_LINK_STATUS, &params);
	if (GL_TRUE != params) {
		char program_log[GL_MAX_DEBUG_MESSAGE_LENGTH];
		glGetProgramInfoLog(
		 context->program, GL_MAX_DEBUG_MESSAGE_LENGTH, NULL, program_log);
		printf(
		 "couldn't compile program %u:\n%s", context->program, program_log);
	}
}
