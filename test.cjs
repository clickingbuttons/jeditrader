const wgsl = require('@use-gpu/shader/wgsl');

const code = ``;
const m = wgsl.loadModule(code);
const t = m.table;
const main = t.exports.find(e => e.symbol === 'main').func;
let params = main.parameters ?? [];
if (!params.length) return;
if (!params[0].attr) {
	// TODO: error checking
	params = t.declarations.find(d => d.symbol === params[0].type).struct.members;
}
console.log('params', params);

console.dir(t, { depth: 4 })
