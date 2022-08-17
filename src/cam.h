#pragma once

#include "linalg.h"
#include "window.h"

typedef struct Cam {
	// Cam state
	vec3 eye;
	vec3 direction;
	vec3 up;
	float pitch;
	float yaw;
	float z_near;
	float z_far;

	// Window state
	bool mouse2_down;
	double last_x;
	double last_y;
	int start_x;
	int start_y;

	// World state
	mat4 view;
	mat4 proj;
} Cam;

void cam_default(Cam* c, Window* window);
void cam_update(Cam* cam, Window* window, double loop_time);
