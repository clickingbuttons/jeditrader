#include "inttypes.h"
#include "cam.h"

bool mouse2_down;
double last_x;
double last_y;

void cam_load_default(struct Cam *cam) {
  cam->eye = HMM_Vec3(-8.837565, -0.14128147, -12.928104);
  cam->direction = HMM_Vec3(0.0017142299, -0.3728435, -0.9278927);
  cam->up = HMM_Vec3(0.0, 0.0, 1.0);
  cam->pitch = -1.1887205;
  cam->yaw = -9.429376;
};

void cam_handle_input(GLFWwindow* window, double loop_time, struct Cam *cam) {
  bool mouse2_down_check = glfwGetMouseButton(window, GLFW_MOUSE_BUTTON_2);

  float cameraSpeed = (float)loop_time * 3;
  if (glfwGetKey(window, GLFW_KEY_W)) {
    if (mouse2_down_check) {
      cam->eye = HMM_SubtractVec3(cam->eye, HMM_MultiplyVec3f(cam->direction, cameraSpeed));
    } else {
      cam->eye = HMM_SubtractVec3(cam->eye, HMM_MultiplyVec3f(cam->direction, cameraSpeed));
    }
  }
  if (glfwGetKey(window, GLFW_KEY_S)) {
    cam->eye = HMM_AddVec3(cam->eye, HMM_MultiplyVec3f(cam->direction, cameraSpeed));
  }
  if (glfwGetKey(window, GLFW_KEY_A)) {
    cam->eye = HMM_SubtractVec3(cam->eye, HMM_MultiplyVec3f(HMM_Cross(cam->direction, cam->up), cameraSpeed * 2));
  }
  if (glfwGetKey(window, GLFW_KEY_D)) {
    cam->eye = HMM_AddVec3(cam->eye, HMM_MultiplyVec3f(HMM_Cross(cam->direction, cam->up), cameraSpeed * 2));
  }
  if (glfwGetKey(window, GLFW_KEY_SPACE)) {
    cam->eye = HMM_SubtractVec3(cam->eye, HMM_MultiplyVec3f(cam->up, cameraSpeed));
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
  
  if (cam->pitch > HMM_PI/2 - 0.1) {
    cam->pitch = HMM_PI/2 - 0.1;
  } else if (cam->pitch < 0.1 - HMM_PI/2) {
    cam->pitch = 0.1 - HMM_PI/2;
  }

  cam->direction = HMM_NormalizeVec3(HMM_Vec3(
    HMM_SINF(cam->yaw) * HMM_COSF(cam->pitch),
    HMM_COSF(cam->yaw) * HMM_COSF(cam->pitch),
    HMM_SINF(cam->pitch)
  ));
}
