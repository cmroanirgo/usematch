var Mustache = require('../usematch').mustache;

var fs = require('fs');
var path = require('path');

var _files = path.join(__dirname, '_mustache_files');

//
// These tests are regarded as 'ignorable'
var ignoreTests = [
	'malicious_template.js'  // mustache & usematch handle Bad Food in the template differently. usematch complains, while mustache tries to comply
];

var testNames = fs.readdirSync(_files).filter(function (file) {
    return (/\.js$/).test(file) && ignoreTests.indexOf(file)<0;
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
  	index: index,
    name: testName,
    view: getView(testName),
    template: getContents(testName, 'mustache'),
    partial: getPartial(testName),
    expect: getContents(testName, 'txt')
  };
}

var tests = testNames.map(getTest);


// insert the default escape function that shipped with mustache. usematch's is different.
 var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  function escapeHtml (string) {
    return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap (s) {
      return entityMap[s];
    });
  }
Mustache.escape = escapeHtml;

var test_to_watch = -1;
var reWHITE = /\s*\n\s*|^\s*|\s*$/g;

describe('Mustache.render', function () {
  beforeEach(function () {
    Mustache.clearCache();
  });

  it('requires template to be a string', function () {
    assert.throws(function () {
      Mustache.render(['dummy template'], ['foo', 'bar']);
    }, TypeError, 'Invalid template! Template should be a "string" for mustache.render()');
  });

  for (var i=Math.max(0,test_to_watch); i<tests.length; i++) {
  	function runnit(test) {
	    var view = eval(test.view);
		var specialOptions = { log: test.index==test_to_watch };

	    it('knows how to render #' +test.index + ', ' + test.name, function () {
			var expect = test.expect.replace(reWHITE, '\n');
	    	if (specialOptions.log){ 
	    		console.log("\n\nStarting " + test.name+"...")
				console.log("Expect:\n======\n"+expect.replace(/\n/g, '\\n')+"\n======\n\n")
	    	}

			var output;
			if (test.partial) {
				output = Mustache.render(test.template, view, { partial: test.partial }, specialOptions);
			} else {
				output = Mustache.render(test.template, view, undefined, specialOptions);
			}

			output = output.replace(reWHITE, '\n');

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
