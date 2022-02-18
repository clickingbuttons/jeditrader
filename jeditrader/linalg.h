// https://github.com/HandmadeMath/Handmade-Math
#pragma once

#include "inttypes.h"

#include <math.h>
#include <stdio.h>
#include <xmmintrin.h>

#define PI 3.14159265358979323846
#define PIf32 __f32(3.141592653589793238462643383279502884)

#define min(X, Y) (((X) < (Y)) ? (X) : (Y))
#define max(X, Y) (((X) > (Y)) ? (X) : (Y))

typedef union vec2 {
  struct {
    float x, y;
  };

  struct {
    float u, v;
  };

  struct {
    float left, right;
  };

  struct {
    float width, height;
  };

  float data[2];
} vec2;

typedef union vec3 {
  struct {
    float x, y, z;
  };

  struct {
    float u, v, w;
  };

  struct {
    float r, g, b;
  };

  struct {
    vec2 xy;
    float _0;
  };

  struct {
    float _1;
    vec2 yz;
  };

  struct {
    vec2 uv;
    float _2;
  };

  struct {
    float _3;
    vec2 vw;
  };

  float data[3];
} vec3;

typedef union vec4 {
  struct {
    union {
      vec3 xyz;
      struct {
        float x, y, z;
      };
    };

    float w;
  };
  struct {
    union {
      vec3 rgb;
      struct {
        float r, g, b;
      };
    };

    float a;
  };

  struct {
    vec2 xy;
    float _0;
    float _1;
  };

  struct {
    float _2;
    vec2 yz;
    float _3;
  };

  struct {
    float _4;
    float _5;
    vec2 zw;
  };

  float data[4];

  __m128 internal_elements_sse;
} vec4;

// Convienence
static vec2 Vec2(float x, float y) {
  return (vec2) { x, y };
}

static vec3 Vec3(float x, float y, float z) {
  return (vec3) { x, y, z };
}

static vec4 Vec4(float x, float y, float z, float w) {
  return (vec4) { x, y, z, w };
}

typedef union mat4 {
  float data[4][4];

  __m128 cols[4];
} mat4;

static inline float rsqrtf(float f) {
  float res;

  __m128 In = _mm_set_ss(f);
  __m128 Out = _mm_rsqrt_ss(In);
  res = _mm_cvtss_f32(Out);

  return res;
}

static inline float to_rads(float degrees) {
  return degrees * (PIf32 / 180.0f);
}

static inline float lerp(float a, float time, float b) {
  return (1.0f - time) * a + time * b;
}

static inline float clamp(float min, float value, float max) {
  float res = value;

  if (res < min) {
    res = min;
  }

  if (res > max) {
    res = max;
  }

  return res;
}

static inline vec2 vec2_add(vec2 left, vec2 right) {
  vec2 res;

  res.x = left.x + right.x;
  res.y = left.y + right.y;

  return res;
}

static inline vec3 vec3_add(vec3 left, vec3 right) {
  vec3 res;

  res.x = left.x + right.x;
  res.y = left.y + right.y;
  res.z = left.z + right.z;

  return res;
}

static inline vec4 vec4_add(vec4 left, vec4 right) {
  vec4 res;

  res.internal_elements_sse =
      _mm_add_ps(left.internal_elements_sse, right.internal_elements_sse);

  return res;
}

static inline vec2 vec2_sub(vec2 left, vec2 right) {
  vec2 res;

  res.x = left.x - right.x;
  res.y = left.y - right.y;

  return res;
}

static inline vec3 vec3_sub(vec3 left, vec3 right) {
  vec3 res;

  res.x = left.x - right.x;
  res.y = left.y - right.y;
  res.z = left.z - right.z;

  return res;
}

static inline vec4 vec4_sub(vec4 left, vec4 right) {
  vec4 res;

  res.internal_elements_sse =
      _mm_sub_ps(left.internal_elements_sse, right.internal_elements_sse);

  return res;
}

static inline vec2 vec2_mult(vec2 left, vec2 right) {
  vec2 res;

  res.x = left.x * right.x;
  res.y = left.y * right.y;

  return res;
}

static inline vec2 vec2_multf(vec2 left, float right) {
  vec2 res;

  res.x = left.x * right;
  res.y = left.y * right;

  return res;
}

static inline vec3 vec3_mult(vec3 left, vec3 right) {
  vec3 res;

  res.x = left.x * right.x;
  res.y = left.y * right.y;
  res.z = left.z * right.z;

  return res;
}

static inline vec3 vec3_multf(vec3 left, float right) {
  vec3 res;

  res.x = left.x * right;
  res.y = left.y * right;
  res.z = left.z * right;

  return res;
}

static inline vec4 vec4_mult(vec4 left, vec4 right) {
  vec4 res;

  res.internal_elements_sse =
      _mm_mul_ps(left.internal_elements_sse, right.internal_elements_sse);

  return res;
}

static inline vec4 vec4_multf(vec4 left, float right) {
  vec4 res;

  __m128 scalar = _mm_set1_ps(right);
  res.internal_elements_sse = _mm_mul_ps(left.internal_elements_sse, scalar);

  return res;
}

static inline vec2 vec2_div(vec2 left, vec2 right) {
  vec2 res;

  res.x = left.x / right.x;
  res.y = left.y / right.y;

  return res;
}

static inline vec2 vec2_divf(vec2 left, float right) {
  vec2 res;

  res.x = left.x / right;
  res.y = left.y / right;

  return res;
}

static inline vec3 vec3_div(vec3 left, vec3 right) {
  vec3 res;

  res.x = left.x / right.x;
  res.y = left.y / right.y;
  res.z = left.z / right.z;

  return res;
}

static inline vec3 vec3_divf(vec3 left, float right) {
  vec3 res;

  res.x = left.x / right;
  res.y = left.y / right;
  res.z = left.z / right;

  return res;
}

static inline vec4 vec4_div(vec4 left, vec4 right) {
  vec4 res;

  res.internal_elements_sse =
      _mm_div_ps(left.internal_elements_sse, right.internal_elements_sse);

  return res;
}

static inline vec4 vec4_divf(vec4 left, float right) {
  vec4 res;

  __m128 scalar = _mm_set1_ps(right);
  res.internal_elements_sse = _mm_div_ps(left.internal_elements_sse, scalar);

  return res;
}

static inline bool vec2_eq(vec2 left, vec2 right) {
  return (left.x == right.x && left.y == right.y);
}

static inline bool vec3_eq(vec3 left, vec3 right) {
  return (left.x == right.x && left.y == right.y && left.z == right.z);
}

static inline bool vec4_eq(vec4 left, vec4 right) {
  return (left.x == right.x && left.y == right.y && left.z == right.z &&
          left.w == right.w);
}

static inline float vec2_dot(vec2 vec_one, vec2 vec_two) {
  return (vec_one.x * vec_two.x) + (vec_one.y * vec_two.y);
}

static inline float vec3_dot(vec3 vec_one, vec3 vec_two) {
  return (vec_one.x * vec_two.x) + (vec_one.y * vec_two.y) +
         (vec_one.z * vec_two.z);
}

static inline float vec4_dot(vec4 vec_one, vec4 vec_two) {
  float res;

  // NOTE(zak): IN the future if we wanna check what version SSE is support
  // we can use _mm_dp_ps (4.3) but for now we will use the old way.
  // Or a r = _mm_mul_ps(v1, v2), r = _mm_hadd_ps(r, r), r = _mm_hadd_ps(r, r)
  // for sse_3
  __m128 sse_res_one =
      _mm_mul_ps(vec_one.internal_elements_sse, vec_two.internal_elements_sse);
  __m128 sse_res_two =
      _mm_shuffle_ps(sse_res_one, sse_res_one, _MM_SHUFFLE(2, 3, 0, 1));
  sse_res_one = _mm_add_ps(sse_res_one, sse_res_two);
  sse_res_two =
      _mm_shuffle_ps(sse_res_one, sse_res_one, _MM_SHUFFLE(0, 1, 2, 3));
  sse_res_one = _mm_add_ps(sse_res_one, sse_res_two);
  _mm_store_ss(&res, sse_res_one);

  return res;
}

static inline vec3 cross(vec3 vec_one, vec3 vec_two) {
  vec3 res;

  res.x = (vec_one.y * vec_two.z) - (vec_one.z * vec_two.y);
  res.y = (vec_one.z * vec_two.x) - (vec_one.x * vec_two.z);
  res.z = (vec_one.x * vec_two.y) - (vec_one.y * vec_two.x);

  return res;
}

/*
 * Unary vector operations
 */

static inline float vec2_len2(vec2 A) { return vec2_dot(A, A); }

static inline float vec3_len2(vec3 A) { return vec3_dot(A, A); }

static inline float vec4_len2(vec4 A) { return vec4_dot(A, A); }

static inline float vec2_len(vec2 A) { return sqrtf(vec2_len2(A)); }

static inline float vec3_len(vec3 A) { return sqrtf(vec3_len2(A)); }

static inline float vec4_len(vec4 A) { return sqrtf(vec4_len2(A)); }

static inline vec2 vec2_norm(vec2 A) {
  vec2 res = {0};

  float vector_length = vec2_len(A);

  if (vector_length != 0.0f) {
    res.x = A.x * (1.0f / vector_length);
    res.y = A.y * (1.0f / vector_length);
  }

  return res;
}

static inline vec3 vec3_norm(vec3 A) {
  vec3 res = {0};

  float vector_length = vec3_len(A);

  if (vector_length != 0.0f) {
    res.x = A.x * (1.0f / vector_length);
    res.y = A.y * (1.0f / vector_length);
    res.z = A.z * (1.0f / vector_length);
  }

  return res;
}

static inline vec4 vec4_norm(vec4 A) {
  vec4 res = {0};

  float vector_length = vec4_len(A);

  if (vector_length != 0.0f) {
    float Multiplier = 1.0f / vector_length;

    __m128 sse_Multiplier = _mm_set1_ps(Multiplier);
    res.internal_elements_sse =
        _mm_mul_ps(A.internal_elements_sse, sse_Multiplier);
  }

  return res;
}

static inline vec2 vec2_norm_fast(vec2 A) {
  return vec2_multf(A, rsqrtf(vec2_dot(A, A)));
}

static inline vec3 vec3_norm_fast(vec3 A) {
  return vec3_multf(A, rsqrtf(vec3_dot(A, A)));
}

static inline vec4 vec4_norm_fast(vec4 A) {
  return vec4_multf(A, rsqrtf(vec4_dot(A, A)));
}

/*
 * SSE stuff
 */

static inline __m128 la_linear_combine_sse(__m128 left, mat4 right) {
  __m128 res;
  res = _mm_mul_ps(_mm_shuffle_ps(left, left, 0x00), right.cols[0]);
  res = _mm_add_ps(res,
                   _mm_mul_ps(_mm_shuffle_ps(left, left, 0x55), right.cols[1]));
  res = _mm_add_ps(res,
                   _mm_mul_ps(_mm_shuffle_ps(left, left, 0xaa), right.cols[2]));
  res = _mm_add_ps(res,
                   _mm_mul_ps(_mm_shuffle_ps(left, left, 0xff), right.cols[3]));

  return res;
}

static inline mat4 mat4d(float diagonal) {
  mat4 res = {0};

  res.data[0][0] = diagonal;
  res.data[1][1] = diagonal;
  res.data[2][2] = diagonal;
  res.data[3][3] = diagonal;

  return res;
}

static inline mat4 mat4_transpose(mat4 matrix) {
  mat4 res = matrix;

  _MM_TRANSPOSE4_PS(res.cols[0], res.cols[1], res.cols[2], res.cols[3]);

  return res;
}

static inline mat4 mat4_add(mat4 left, mat4 right) {
  mat4 res;

  res.cols[0] = _mm_add_ps(left.cols[0], right.cols[0]);
  res.cols[1] = _mm_add_ps(left.cols[1], right.cols[1]);
  res.cols[2] = _mm_add_ps(left.cols[2], right.cols[2]);
  res.cols[3] = _mm_add_ps(left.cols[3], right.cols[3]);

  return res;
}

static inline mat4 mat4_sub(mat4 left, mat4 right) {
  mat4 res;

  res.cols[0] = _mm_sub_ps(left.cols[0], right.cols[0]);
  res.cols[1] = _mm_sub_ps(left.cols[1], right.cols[1]);
  res.cols[2] = _mm_sub_ps(left.cols[2], right.cols[2]);
  res.cols[3] = _mm_sub_ps(left.cols[3], right.cols[3]);

  return res;
}

static inline mat4 mat4_mult(mat4 left, mat4 right) {
  mat4 res;

  res.cols[0] = la_linear_combine_sse(right.cols[0], left);
  res.cols[1] = la_linear_combine_sse(right.cols[1], left);
  res.cols[2] = la_linear_combine_sse(right.cols[2], left);
  res.cols[3] = la_linear_combine_sse(right.cols[3], left);

  return res;
}

static inline mat4 mat4_multf(mat4 matrix, float scalar) {
  mat4 res;

  __m128 sse_scalar = _mm_set1_ps(scalar);
  res.cols[0] = _mm_mul_ps(matrix.cols[0], sse_scalar);
  res.cols[1] = _mm_mul_ps(matrix.cols[1], sse_scalar);
  res.cols[2] = _mm_mul_ps(matrix.cols[2], sse_scalar);
  res.cols[3] = _mm_mul_ps(matrix.cols[3], sse_scalar);

  return res;
}

static inline vec4 mat4_mult_vec4(mat4 matrix, vec4 Vector) {
  vec4 res;

  res.internal_elements_sse =
      la_linear_combine_sse(Vector.internal_elements_sse, matrix);

  return res;
}

static inline mat4 mat4_divf(mat4 matrix, float scalar) {
  mat4 res;

  __m128 sse_scalar = _mm_set1_ps(scalar);
  res.cols[0] = _mm_div_ps(matrix.cols[0], sse_scalar);
  res.cols[1] = _mm_div_ps(matrix.cols[1], sse_scalar);
  res.cols[2] = _mm_div_ps(matrix.cols[2], sse_scalar);
  res.cols[3] = _mm_div_ps(matrix.cols[3], sse_scalar);

  return res;
}

static inline mat4 perspective_project(float FOV, float aspect_ratio,
                                       float z_near, float z_far) {
  mat4 res = {0};
  float z_range = z_near - z_far;
  float tanFOV = tanf(to_rads(FOV / 2.0f));
  float f = 1.0f / tanFOV;

  float A = (-z_far - z_near) / z_range;
  float B = 2.0f * z_far * z_near / z_range;

  res.data[0][0] = f / aspect_ratio;
  res.data[1][1] = f;
  res.data[2][2] = A;
  res.data[3][2] = B;
  res.data[2][3] = 1.0f;

  return res;
}

static inline mat4 look_at(vec3 eye, vec3 direction, vec3 up) {
  mat4 res;

  vec3 z = vec3_norm(direction);
  vec3 x = vec3_norm(cross(up, z));
  vec3 y = cross(z, x);

  res.data[0][0] = x.x;
  res.data[1][0] = x.y;
  res.data[2][0] = x.z;
  res.data[3][0] = vec3_dot(x, eye);
                
  res.data[0][1] = y.x;
  res.data[1][1] = y.y;
  res.data[2][1] = y.z;
  res.data[3][1] = vec3_dot(y, eye);
                
  res.data[0][2] = z.x;
  res.data[1][2] = z.y;
  res.data[2][2] = z.z;
  res.data[3][2] = vec3_dot(z, eye);
                
  res.data[0][3] = 0.0f;
  res.data[1][3] = 0.0f;
  res.data[2][3] = 0.0f;
  res.data[3][3] = 1.0f;

  return res;
}

static inline mat4 translate(vec3 translation) {
  mat4 res = mat4d(1.0f);

  res.data[3][0] = translation.x;
  res.data[3][1] = translation.y;
  res.data[3][2] = translation.z;

  return res;
}

static inline mat4 rotate(float angle, vec3 axis) {
  mat4 res = mat4d(1.0f);

  axis = vec3_norm(axis);

  float sin_theta = sinf(to_rads(angle));
  float cos_theta = cosf(to_rads(angle));
  float cos_value = 1.0f - cos_theta;

  res.data[0][0] = (axis.x * axis.x * cos_value) + cos_theta;
  res.data[0][1] = (axis.x * axis.y * cos_value) + (axis.z * sin_theta);
  res.data[0][2] = (axis.x * axis.z * cos_value) - (axis.y * sin_theta);

  res.data[1][0] = (axis.y * axis.x * cos_value) - (axis.z * sin_theta);
  res.data[1][1] = (axis.y * axis.y * cos_value) + cos_theta;
  res.data[1][2] = (axis.y * axis.z * cos_value) + (axis.x * sin_theta);

  res.data[2][0] = (axis.z * axis.x * cos_value) + (axis.y * sin_theta);
  res.data[2][1] = (axis.z * axis.y * cos_value) - (axis.x * sin_theta);
  res.data[2][2] = (axis.z * axis.z * cos_value) + cos_theta;

  return res;
}

static inline mat4 scale(vec3 scale) {
  mat4 res = mat4d(1.0f);

  res.data[0][0] = scale.x;
  res.data[1][1] = scale.y;
  res.data[2][2] = scale.z;

  return res;
}

static void mat4_print(mat4 mat) {
  for (int i = 0; i < 4; i++) {
    for (int j = 0; j < 4; j++) {
      printf("%f ", mat.data[i][j]);
    }
    printf("\n");
  }
  printf("\n");
}
