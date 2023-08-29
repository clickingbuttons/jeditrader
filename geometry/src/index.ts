// Construct an axis-aligned solid cuboid. Optional parameters are `center` and
// `radius`, which default to `[0, 0, 0]` and `[1, 1, 1]`. The radius can be
// specified using a single number or a list of three numbers, one for each axis.

// Construct a solid sphere. Optional parameters are `center`, `radius`,
// `slices`, and `stacks`, which default to `[0, 0, 0]`, `1`, `16`, and `8`.
// The `slices` and `stacks` parameters control the tessellation along the
// longitude and latitude directions.
//
// Example usage:
//
//     var sphere = CSG.sphere({
//       center: [0, 0, 0],
//       radius: 1,
//       slices: 16,
//       stacks: 8
//     });
// CSG.sphere = function(options) {
//   options = options || {};
//   var c = new CSG.Vector(options.center || [0, 0, 0]);
//   var r = options.radius || 1;
//   var slices = options.slices || 16;
//   var stacks = options.stacks || 8;
//   var polygons = [], vertices;
//   function vertex(theta, phi) {
//     theta *= Math.PI * 2;
//     phi *= Math.PI;
//     var dir = new CSG.Vector(
//       Math.cos(theta) * Math.sin(phi),
//       Math.cos(phi),
//       Math.sin(theta) * Math.sin(phi)
//     );
//     vertices.push(new CSG.Vertex(c.plus(dir.times(r)), dir));
//   }
//   for (var i = 0; i < slices; i++) {
//     for (var j = 0; j < stacks; j++) {
//       vertices = [];
//       vertex(i / slices, j / stacks);
//       if (j > 0) vertex((i + 1) / slices, j / stacks);
//       if (j < stacks - 1) vertex((i + 1) / slices, (j + 1) / stacks);
//       vertex(i / slices, (j + 1) / stacks);
//       polygons.push(new CSG.Polygon(vertices));
//     }
//   }
//   return CSG.fromPolygons(polygons);
// };
export * from './csg.js';
export * from './plane.js';
export * from './polygon.js';
export * from './cube.js';
export * from './sphere.js';
export * from './vertex.js';
