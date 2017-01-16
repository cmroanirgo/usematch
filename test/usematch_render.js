var usematch = require('../usematch');
var fs = require('fs');
var path = require('path');

var _files = path.join(__dirname, '_usematch_files');

var testNames = fs.readdirSync(_files).filter(function (file) {
    return (/\.js$/).test(file);
  }).map(function (file) {
    return path.basename(file).replace(/\.js$/, '');
  });


function getContents(testName, ext) {
  try {
    return fs.readFileSync(path.join(_files, testName + '.' + ext), 'utf8');
  } catch (ex) {
    return null;
  }
}

function getView(testName) {
  var view = getContents(testName, 'js');
  if (!view) throw new Error('Cannot find view for test "' + testName + '"');
  return view;
}

function getPartial(testName) {
  try {
    return getContents(testName, 'partial');
  } catch (error) {
    // No big deal. Not all tests need to test partial support.
  }
}

function getTest(testName, index) {
  return {
  	index: index+1,
    name: testName,
    view: getView(testName),
    template: getContents(testName, 'usematch'),
    partial: getPartial(testName),
    expect: getContents(testName, 'txt')
  };
}

var tests = testNames.map(getTest);

var test_to_watch = -1;


describe('Usematch.render', function () {
  for (var i=Math.max(0,test_to_watch); i<tests.length; i++) {
  	function runnit(test) {
	    var view = eval(test.view);
		var specialOptions = { log: test.index==test_to_watch };

	    it('knows how to render #' +test.index + ', ' + test.name, function () {
			var expect = test.expect;
	    	if (specialOptions.log){ 
	    		console.log("\n\nStarting " + test.name+"...")
				console.log("Expect:\n======\n"+expect.replace(/\n/g, '\\n')+"\n======\n\n")
	    	}

			var output;
			if (test.partial) {
				output = usematch.render(test.template, view, { partials: {partial: test.partial}, log:specialOptions.log } );
			} else {
				output = usematch.render(test.template, view, specialOptions);
			}

			if (specialOptions.log)
				console.log(test.name + ":\n======\n'"+output.replace(/\n/g, '\\n')+"'\n==vs==\n'"+expect.replace(/\n/g, '\\n')+"'\n======\n\n")

			assert.equal(output, expect);

	    });
	}
	runnit(tests[i])
	if (i==test_to_watch)
		break;

  }
});
