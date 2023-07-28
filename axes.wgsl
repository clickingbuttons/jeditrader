struct Camera {
    mvp: mat4x4<f32>,
}

struct Axes {
    colorThin: vec4<f32>,
    colorThick: vec4<f32>,
    minCellSize: f32,
    minPixelsBetweenCells: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) 
var<uniform> camera: Camera;
@group(1) @binding(0) 
var<uniform> axes: Axes;

fn log10_(x: f32) -> f32 {
    return (log(x) / log(10.0));
}

fn satf(x_1: f32) -> f32 {
    return clamp(x_1, 0.0, 1.0);
}

fn satv(x_2: vec2<f32>) -> vec2<f32> {
    return clamp(x_2, vec2<f32>(0.0), vec2<f32>(1.0));
}

fn max2_(v: vec2<f32>) -> f32 {
    return max(v.x, v.y);
}

@vertex 
fn vert(@location(0) position: vec3<f64>) -> VertexOutput {
    let _e3 = camera.mvp;
    return VertexOutput(vec4<f32>((_e3 * vec4<f64>(position, f64(1.0)))), vec2<f32>(position.xy));
}

@fragment 
fn frag(in: VertexOutput) -> @location(0) vec4<f32> {
    var dudv: vec2<f32>;
    var res: vec4<f32>;

    let uv = abs(in.uv);
    let _e4 = dpdx(uv.x);
    let _e6 = dpdy(uv.x);
    let _e10 = dpdx(uv.y);
    let _e12 = dpdy(uv.y);
    dudv = vec2<f32>(length(vec2<f32>(_e4, _e6)), length(vec2<f32>(_e10, _e12)));
    let _e18 = dudv;
    let _e22 = axes.minPixelsBetweenCells;
    let _e26 = axes.minCellSize;
    let _e28 = log10_(((length(_e18) * _e22) / _e26));
    let lodLevel = max(0.0, (_e28 + 1.0));
    let lodFade = fract(lodLevel);
    let _e35 = axes.minCellSize;
    let lod0_ = (_e35 * pow(10.0, floor(lodLevel)));
    let lod1_ = (lod0_ * 10.0);
    let lod2_ = (lod1_ * 10.0);
    let _e45 = dudv;
    dudv = (_e45 * 2.0);
    let _e51 = dudv;
    let _e53 = satv(((uv % vec2<f32>(lod0_)) / _e51));
    let _e61 = max2_((vec2<f32>(1.0) - abs(((_e53 * 2.0) - vec2<f32>(1.0)))));
    let _e66 = dudv;
    let _e68 = satv(((uv % vec2<f32>(lod1_)) / _e66));
    let _e76 = max2_((vec2<f32>(1.0) - abs(((_e68 * 2.0) - vec2<f32>(1.0)))));
    let _e81 = dudv;
    let _e83 = satv(((uv % vec2<f32>(lod2_)) / _e81));
    let _e91 = max2_((vec2<f32>(1.0) - abs(((_e83 * 2.0) - vec2<f32>(1.0)))));
    let _e94 = axes.colorThin;
    res = _e94;
    if (_e91 > 0.0) {
        let _e100 = axes.colorThick;
        res = _e100;
    } else {
        if (_e76 > 0.0) {
            let _e105 = axes.colorThick;
            let _e108 = axes.colorThin;
            res = mix(_e105, _e108, lodFade);
        }
    }
    let _e112 = dudv.x;
    let _e117 = dudv.x;
    if ((uv.x > -(_e112)) && (uv.x < _e117)) {
        res.y = 0.4;
    }
    let _e124 = dudv.y;
    let _e129 = dudv.y;
    if ((uv.y > -(_e124)) && (uv.y < _e129)) {
        res.x = 0.4;
    }
    let _e134 = res;
    return _e134;
}
