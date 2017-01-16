/*

function loadTestFiles(_filename, context) {
	const fs = require('fs')
	const path = require('path')

	var basename_no_ext = path.basename(_filename, path.extname(_filename));
	var filename_no_ext = path.join(path.dirname(_filename), basename_no_ext);

	var source_template = filename_no_ext + '.usematch';
	if (!fs.existsSync(source_template))
		source_template = filename_no_ext + '.mustache';
	

	var data = {
		filename: source_template,
		template: fs.readFileSync(source_template, 'utf8'),
		context: context || require(filename_no_ext + '.context'),
		expect: fs.readFileSync(filename_no_ext + '.txt', 'utf8')
	}
	return data;
}


function loadAndRunTest(_filename, context, logging_level) 
{
	const um = require('../../usematch');
	const util = require('util');
	const path = require('path');

	var log = console.log;
	function logObj(obj) {	console.log(util.inspect(obj, {colors:true})+'\n'); }

	var data = loadTestFiles(_filename, context);


	describe('Ensures that '+path.basename(data.filename), function() {
		it('parses the template correctly', function() {
			if (logging_level>1) {
				var obj = um.parse(data.template, {log:true});
				log("\n\n\n\n"); logObj(obj);
				assert.isArray(obj)
			}

			assert.doesNotThrow(function() {
				var obj = um.parse(data.template);
				//logObj(obj);

			}, Error, "Bad food detected!");


		})
		it('renders as expected', function() {
			var text = um.render(data.template, data.context);
			if (logging_level>1){
				log('\n\n\n=====\n'+text+"====");
				log('\n\n\n=====\n'+data.expect+"====");
			}
			assert.equal(text, data.expect);

		})
	});


}

global.loadTestFiles = loadTestFiles;
global.loadAndRunTest = loadAndRunTest
global.logObj = function(obj) {	console.log(require('util').inspect(obj, {colors:true})+'\n'); }
*/
