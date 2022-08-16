#pragma once

#include "linalg.h"
#include "window.h"

typedef struct Cam {
	vec3 eye;
	vec3 direction;
	vec3 up;
	float pitch;
	float yaw;
	// Window state
	bool mouse2_down;
	double last_x;
	double last_y;
	int start_x;
	int start_y;
} Cam;

void cam_default(Cam* cam);
void cam_update(Cam* cam, Window* window, double loop_time);
