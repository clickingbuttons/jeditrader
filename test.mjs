import Jasmine from 'jasmine';
const jasmine = new Jasmine();

global['navigator'] = undefined;

jasmine.loadConfig({
	"spec_dir": ".",
	"spec_files": [
		"*/spec/*.js"
	],
	"env": {
		"stopSpecOnExpectationFailure": false,
		"random": false
	}
});
jasmine.execute();
