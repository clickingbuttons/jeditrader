#include "inttypes.h"
#include "cam.h"

bool mouse2_down;
double last_x;
double last_y;

void cam_load_default(struct Cam *cam) {
  cam->eye = (vec3) {-8.837565, -0.14128147, -12.928104 };
  cam->direction = (vec3) {0.0017142299, -0.3728435, -0.9278927 };
  cam->up = (vec3) {0.0, 0.0, 1.0};
  cam->pitch = -1.1887205;
  cam->yaw = -9.429376;
};

void cam_handle_input(GLFWwindow* window, double loop_time, struct Cam *cam) {
  bool mouse2_down_check = glfwGetMouseButton(window, GLFW_MOUSE_BUTTON_2);

  float cameraSpeed = (float)loop_time * 3;
  if (glfwGetKey(window, GLFW_KEY_W)) {
    if (mouse2_down_check) {
      cam->eye = vec3_sub(cam->eye, vec3_multf(cam->direction, cameraSpeed));
    } else {
      cam->eye = vec3_sub(cam->eye, vec3_multf(cam->direction, cameraSpeed));
    }
  }
  if (glfwGetKey(window, GLFW_KEY_S)) {
    cam->eye = vec3_add(cam->eye, vec3_multf(cam->direction, cameraSpeed));
  }
  if (glfwGetKey(window, GLFW_KEY_A)) {
    cam->eye = vec3_sub(cam->eye, vec3_multf(cross(cam->direction, cam->up), cameraSpeed * 2));
  }
  if (glfwGetKey(window, GLFW_KEY_D)) {
    cam->eye = vec3_add(cam->eye, vec3_multf(cross(cam->direction, cam->up), cameraSpeed * 2));
  }
  if (glfwGetKey(window, GLFW_KEY_SPACE)) {
    cam->eye = vec3_sub(cam->eye, vec3_multf(cam->up, cameraSpeed));
  }

  double xoff, yoff;
  glfwGetCursorPos(window, &xoff, &yoff);
  double dx = xoff - last_x;
  double dy = yoff - last_y;
  last_x = xoff;
  last_y = yoff;

  if (!mouse2_down && mouse2_down_check) {
    mouse2_down = true;
    glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);
    return;
  } else if (mouse2_down && !mouse2_down_check) {
    mouse2_down = false;
    glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_NORMAL);
  }
  if (!mouse2_down) {
    return;
  }

  float mouseSpeed = loop_time / 4;
  cam->pitch += (dy * mouseSpeed);// % (2*HMM_PI);
  cam->yaw   += (dx * mouseSpeed);// % (2*HMM_PI);
  
  if (cam->pitch > PI/2 - 0.1) {
    cam->pitch = PI/2 - 0.1;
  } else if (cam->pitch < 0.1 - PI/2) {
    cam->pitch = 0.1 - PI/2;
  }

  cam->direction = vec3_norm((vec3) {
    sinf(cam->yaw) * cosf(cam->pitch),
    cosf(cam->yaw) * cosf(cam->pitch),
    sinf(cam->pitch)
  });
}
