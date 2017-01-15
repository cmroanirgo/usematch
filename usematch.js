/**
 * @license MIT
 * Copyright (c) 2016 Craig Monro (cmroanirgo)
 **/
"use strict";


/*
Mustache on acid: usematch
				(an anagram)
*/


var l = function() { } // a logging function. It is enabled with options.log === true
function logObj(str, obj) { l(str + " " + require('util').inspect(obj, {colors:true})) } 

// simple helper functions
function _objIsType(obj, typeStr) { return Object.prototype.toString.call(obj) === '[object '+typeStr+']'}
function isArray(obj) { return _objIsType(obj, 'Array');  }
function isRegExp(obj) { return _objIsType(obj, 'RegExp');  }
function isFunction(obj) { return typeof obj === 'function' };
function isString(str) { return typeof str === 'string'; }
function isEmptyString(str) { return !str || str.length==0; }
function isDefined(x) { return x !== undefined; }
function isBool(x) { return typeof x == 'boolean'; }
function isObject(x) { return x !== null && typeof x === 'object'}
function isFalsy(x) { return !x || (isArray(x) && x.length === 0) }
function hasProperty(obj, propName) { return obj != null && typeof obj === 'object' && (propName in obj); }
function extend(dest) { // does a 'shallow' copy/merge of values
		for (var a=1; a<arguments.length; a++) {
			var add = arguments[a];
			if (add === null || typeof add !== 'object')
				continue;
			var keys = Object.keys(add)
			var i = keys.length
			while (i--) {
				dest[keys[i]] = add[keys[i]]
			}
		}

		return dest
	}

// string trimmers

function trimL(str, val) {
	if (!str) return str;
	if (!isArray(val)) val = [val];
	val.forEach(function(val) {
		if (str.substr(0,val.length)===val)
			str = str.substr(val.length)
	})
	return str;
}
function trimR(str, val) {
	if (!str) return str;
	if (!isArray(val)) val = [val];
	val.forEach(function(val) {
		if (str.substr(-val.length)===val)
			str = str.substr(0, str.length-val.length)
	})
	return str;
}
function trimLR(str, _val) { // not the same as trim()!!! this forces a balanced trim
	if (!str) return str;
	if (!isArray(_val)) _val = [_val];
	_val.forEach(function(val) {
		if (str.substr(0,val.length)===val && str.substr(-val.length)===val)
			str = str.substr(val.length, str.length-val.length*2)
	})
	return str;
}
function trim(str, val)
{
	return trimL(trimR(str, val), val);
}

function _reEscape(str) {
	// mustache version: return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
	return str.replace(/(\W)/g, "\\$1"); // put an escape (\) in front of any symbol-esque chars.
}


// RegExp builder helpers
function _rePrepSubMatch(re, remove_subCaptures) { 
	// given a RegExp, removes ^, $ and any whitespace directives at the ends 
	//		and finally converts all captures (...) to non capture (?:...)
	// Why? This is so that this re can be used as a sub-match in another RegExp.

	var source = re.source || re;
	// removes ^ at the start and $ and the end of a RegExp
	source = trimL(source, '^')
	source = trimR(source, '$')
	source = trim(source, ['\\s*?', '\\s*']) // remove whitespace at start & end

	// change all captures to non-captures
	if (remove_subCaptures)
		source = source.replace( /\((?!\?)/g, "(?:") // thankfully we don't have to back check for escaped \( ... b/c this matches them
	return source;
}

function _reFriendly(re, reText, reWith, remove_subCaptures) {
	// given a RegExp with a 'nice' string in it:
		// replaces the 'nice' string (reText) with a pattern (reWith)
	//  eg. _reFriendly(/^\s*?(some_demo)/g, 'some_demo', /[A-Z0-9]*/) ==> /^\s*([A-Z0-9]*)/g

	// The _rePrepSubMatch() removes all match and start/end of line expressions, including whitespaces & captures
	var n = new RegExp(re.source.replace(new RegExp(reText, 'g'), _rePrepSubMatch(reWith, remove_subCaptures)), re.flags);
	n.orig = re; // keep the original
	return n;
}
function _reFriendlyA(re, reTextA, reWithA, remove_subCaptures) {
	// same as above but takes arrays:
	//  eg. _reFriendlyA(/^\s*?(uppers|lowers)/g, ['uppers','lowers'], [/[A-Z]*/, /[a-z]*/]) ==> /^\s*([A-Z]*|[a-z]*)/g
	if (reTextA.length!=reWithA.length) 
		throw Error("_reFriendlyA needs arrays of the same size");
	var source = re.source;
	for(var i=0; i<reTextA.length; i++) {
		source = source.replace(new RegExp(reTextA[i], 'g'), _rePrepSubMatch(reWithA[i], remove_subCaptures));
	}
	var n = new RegExp(source, re.flags);
	n.orig = re; // keep the original
	//l(n.orig.source + " ==> " + n.source)
	return n;
}




/*
We use a different method to parse the template from mustache.
*/

var TOKEN = { // note that these token values are ARBITARY. They can be numeric, or whatever.
	TEXT: "text",		// data = text
	VALUE: "value",		// data = { name:name, raw:true|(undefined), PARAMETERS}
	SECTION_START: "#", // data = { name:name, tokens:[], elseTokens:[]|undefined, PARAMETERS}
	SECTION_NOT: "^", 	// 	(same as above SECTION_START), only meaning is reversed
	PARTIAL: ">",       // data = { name:name, PARAMETERS}

	// NB: PARAMETERS one or more of:
	//  { filterName:name, contextName:name, context:{"some":"json"}}
}

var __MATCHES = {};
	// Valid name chars: http://stackoverflow.com/questions/8676011/which-characters-are-valid-invalid-in-a-json-key-name

	// a 'valid' name: has at least ONE character & doesn't include:
	//	spaces, quotes, and 'function-ish' chars (like brackets and braces)
	// eg: This is valid: "^%&*_ok!@#hereº¡§ª"
	//     This isn't"    "'name'"		(but "name" is ok)
__MATCHES.NAME=               /[^\s\'\"\(\)\{\}\uD800-\uDFFF]+/
__MATCHES.PARAMETERS=         /(?:\s+(.+?))?\s*/ // this is 'to the right' of a tag's name
__MATCHES.SECTION_START= _reM(/\s*\#(NAME)PARAMETERS/)
__MATCHES.SECTION_END=   _reM(/\s*\/(NAME)PARAMETERS/)
__MATCHES.SECTION_NOT=   _reM(/\s*\^(NAME)PARAMETERS/)
__MATCHES.PARTIAL=       _reM(/\s*\>(NAME)PARAMETERS\s*/)
__MATCHES.VALUE=         _reM(/\s*(NAME)PARAMETERS\s*/)
__MATCHES.RAW=           _reM(/\s*\&(NAME)PARAMETERS\s*/)
__MATCHES.RAW_BRACED=    _reM(/\s*\{(NAME)\}\s*/),
__MATCHES.TAG_CHANGE=         /\=([\S]{1,10}) +([\S]{1,10})\=/  // note the SPACE literal ' '+, rather than \s+

var PARAMETER_MATCHES = { 
	FILTER:        _reM(/^\s*\#(NAME)(?:\s*|$)/),
	CONTEXT_REF:   _reM(/^\s*\&(NAME)(?:\s*|$)/),
	CONTEXT:            /^\s*\{(.*)\}\s*$/ // a context MUST be at the end (too error prone otherwise)
};

function _reM(re) { return _reFriendlyA(re, ['NAME', 'PARAMETERS'], [__MATCHES.NAME, __MATCHES.PARAMETERS], false); }



/**
* A simple string scanner that is used by the template parser to find
* tokens in template strings.
* Lifted from mustache (with heapsa changes). 
*/
function Scanner(text) {
	this.text = text;
	this.pos = 0;
}

/**
* Returns `true` if the text is empty (end of string).
*/
Scanner.prototype.eos = function() {
	return this.text.length<1;
};

/**
* Tries to match the given regular expression at the current position.
* calls back in a function on the first match
* Returns the match object, but is generally only used as 'truish' or 'falsish'
*/

Scanner.prototype.match = function match (re, fn) {
	//l("Executing " + re.source + " on '" + this.text + "'")
	this.last_match = re.exec(this.text);
	if (this.last_match) {
		//logObj("matched: ", this.last_match)
		var str = this.last_match[0];
		this.text = this.text.substring(str.length);
		this.pos += str.length; 
		if (fn)
			fn.apply(null, this.last_match.slice(1));	
	};
};

/**
* Skips all text until the given regular expression can be matched. Returns
* the skipped string, which is the entire tail if no match can be made.
*/
Scanner.prototype.scanUntil = function scanUntil (re) {
	if (!re) throw new Error("Missing Regular Expression")
	var index = this.text.search(re), match;
	this.last_scan = index;
	switch (index) {
	  case -1:
	    match = this.text;
	    this.text = '';
	    break;
	  case 0:
	    match = '';
	    break;
	  default:
	    match = this.text.substring(0, index);
	    this.text = this.text.substring(index);
	}

	this.pos += match.length;
	//logObj("\nScanner state after scanUntil is now: ", this)

	return match;
};


/*
* A super simple (private) class to house our tokens in a list
*/
function __Tokens() {
	this.tokens = [];
}
__Tokens.prototype.push = function(type, name, data, parameters) {
	this.tokens.push({ type: type, name:name, data: data, params: parameters})
};


function _parse(template, options) {
	if (options.log === true) l = console.log;
	var scanner = new Scanner(template);
	var tokens = new __Tokens();
	var current_options = options;


	// re make our matches to be surrounded by the current start and end tags (normally {{ and }})
	function makeMATCHES(options) {
		var m = {
			TAG_START:    new RegExp(options.tag_start + ".*" + options.tag_end),
			ELSE:         new RegExp(options.tag_start + "\\s*(?:else|ELSE)\\s*" + options.tag_end),
		}
		for (var key in __MATCHES) {
			m[key] = new RegExp("^" + options.tag_start + _rePrepSubMatch(__MATCHES[key]) + options.tag_end)
		}
		return m;
	}

	function readParameters(name, parameters) {
		var data = {};
		var param_scanner = new Scanner(parameters || '')
		while (!param_scanner.eos())
		{
			logObj("\nParam scanner state is: \n", param_scanner)
			if (param_scanner.match(PARAMETER_MATCHES.FILTER, function(filterName) {
				if (data.filterName) throw new Error("Only one filter allowed for section '" + name + "'")
				data.filterName = filterName;
			}))
				;
			else if (param_scanner.match(PARAMETER_MATCHES.CONTEXT_REF, function(refName) {
				if (data.context || data.contextName) throw new Error("Only one context allowed for section '" + name + "'")
				data.contextName = refName;
			}))
				;
			else if (param_scanner.match(PARAMETER_MATCHES.CONTEXT, function(json) {
				if (data.context || data.contextName) throw new Error("Only one context allowed for section '" + name + "'")
				l("json str: " +json)
				data.context = JSON.parse(json);
			}))
				;
			else
			{
				// Hard Fail on Bad Food.
				if (!param_scanner.eos())
					throw new Error("Unknown parameters for section '"+name+"': '" + param_scanner.text+"'")
			}
		}
		return data;
	}



	function beginSection(name, parameters, isSection) {
		var params = readParameters(name, parameters);
		var data = {tokens:[]}
		var text = scanner.scanUntil(MATCHES.ELSE);
		var hasElse = text.length>0;
		if (text.length>0){ 
			// found: {{else}}
			//l("Found {{else}}. This is the first part: " + text)
			data.tokens = _parse(text, current_options);
			scanner.match(MATCHES.ELSE); // eat the 'else'
		}
		var re_EndSection = new RegExp(options.tag_start + "\\s*\/"+_reEscape(name)+"\\s*" + options.tag_end);
		//logObj("Has else: "+hasElse+". looking for: ", re_EndSection)
		text = scanner.scanUntil(re_EndSection);
		if (text.length>0) {
			//l("Section text is: " + text.replace(/\n/g, '\\n'))
			var sub_tokens = _parse(text, current_options);
			if (hasElse)
				data.elseTokens = sub_tokens;
			else
				data.tokens = sub_tokens;
			scanner.match(re_EndSection); // eat the 'end'
		}
		else
		{
			// Hard Error on end not found
			if (scanner.last_scan<0)
				throw new Error("End section for '" + name + "' not found!");
		}

		tokens.push(isSection ? TOKEN.SECTION_START : TOKEN.SECTION_NOT, name, data, params)
	}

	var MATCHES = makeMATCHES(options);
	//logObj("\n\nMATCHES", MATCHES) + l('\n')
	while (!scanner.eos()) {
		logObj("\nScanner state is: \n", scanner)
		var text = scanner.scanUntil(MATCHES.TAG_START);
		if (text.length>0) {
			// remove all but one whitespace from the outer edges of the text.
			//text = text[0] + trim(text.substr(1), ['\r', '\n', ' ', '\t']);
			l("Pushing text block: " + text.substr(0,100).replace(/\n/g, '\\n') + "...")
			tokens.push(TOKEN.TEXT, null, text)
		}
		/*else {
			// no more text:
			l("Final text block: '"+scanner.text.replace(/\n/g, '\\n')+"'")
			tokens.push(_token(TOKEN.TEXT, scanner.text))
			scanner.text = '';
		}*/

		if (!scanner.eos()) {
			var m;
			if (m = scanner.match(MATCHES.TAG_CHANGE, function(start_tag, end_tag) {
				// found: {{=<% %>=}}
				l("Found {{=tag change=}}: " + start_tag + " " + end_tag + " ...")
				current_options = extend({}, options, { tag_start: start_tag, tag_end: end_tag})
				MATCHES = makeMATCHES(current_options)
			})) 
				{}
			else if (m = scanner.match(MATCHES.RAW_BRACED, function(name) {
				// found: {{{name}}}
				l("Found raw value {{{...}}}: " + name + " ...")
				tokens.push(TOKEN.VALUE, name, {raw:true});
			}))
				;
			else if (m = scanner.match(MATCHES.SECTION_START, function(name, parameters) {
				// found: {{#name optional_params}}
				l("Found section {{#...}}: " + name + "...")
				beginSection(name, parameters, true)
			}))
				;
			else if (m = scanner.match(MATCHES.SECTION_NOT, function(name, parameters) {
				// found: {{^name optional_params}}
				l("Found NOT section {{^...}}: " + name + "...")
				beginSection(name, parameters, false)
			}))
				;
			else if (m = scanner.match(MATCHES.VALUE, function(name, parameters) {
				// found: {{value optional_params}}
				l("Found value {{...}}: " + name + "...")
				tokens.push(TOKEN.VALUE, name, null, readParameters(name, parameters))
			}))
				;
			else if (m = scanner.match(MATCHES.RAW, function(name, parameters) {
				// found: {{&value optional_params}}
				l("Found raw value {{&...}}: " + name + "...")
				tokens.push(TOKEN.VALUE, name, {raw:true}, readParameters(name, parameters))
			}))
				;
			else if (m = scanner.match(MATCHES.PARTIAL, function(name, parameters) {
				// found: {{>partial optional_params}}
				l("Found partial {{>...}}: " + name + "{"+parameters+"} ...")
				var params = readParameters(name, parameters);
				tokens.push(TOKEN.PARTIAL, name, null, params)
			}))
				;
			// else it must be just text. loop around
			else {
				l("No matches for: '" + scanner.text.substr(0,100).replace(/\n/g, '\\n') +"'...")
			}
		}
	}

	return tokens.tokens; // always return the native array.
}

// look at the token, & see if we have been given either a context or a contextName & merge that with the given context
function _getContext(context, token) {
	var defaultContext = {};
	if (token.params.contextName) {
		var c = _findValue(token.contextName, context);
		if (!c)
			throw new Error("Named context reference '" + token.contextName + "' not found")
		extend(defaultContext, c);
	}
	else if (token.params.context)
		extend(defaultContext, token.context);

	return extend(defaultContext, context)
}

function _filterValue(value, context, token) {
	if (!token.params.filterName)
		return value;
	var fn = _findValue(token.params.filterName, context, false);
	if (!fn)
		throw new Error("Named filter reference '" + token.params.filterName + "' not found");
	if (!isFunction(fn))
		throw new Error("Named filter reference '" + token.params.filterName + "' is not a function: " + require('util').inspect(context));
	return fn.call(context, value);
}

function _findValue(name, _context, _callIfFunction) {
	if (_callIfFunction===undefined) _callIfFunction = true;
    var value, context = _context, names, index, lookupHit = false;

	while (context && !lookupHit) {
		if (name.indexOf('.') > 0) {
			names = name.split('.');
			index = 0;

			/**
			* Using the dot notion path in `name`, we descend through the
			* nested objects.
			*
			* To be certain that the lookup has been successful, we have to
			* check if the last object in the path actually has the property
			* we are looking for. We store the result in `lookupHit`.
			*
			* This is specially necessary for when the value has been set to
			* `undefined` and we want to avoid looking up parent contexts.
			**/
			while (context != null && index < names.length) {
				if (index === names.length - 1)
					lookupHit = hasProperty(context, names[index]);

				context = context[names[index++]];
			}
		} else {
			value = context[name];
			lookupHit = true; // hasProperty(context, name);
		}
	}

	if (_callIfFunction && isFunction(value))
		value = value.call(_context);

    return value;
}

function _renderSectionTokens(name, tokens, section, context, options) {
	if (!isArray(tokens)) throw new Error("expected a valid tokens array")
	if (isArray(section)) {
		var strings = [];
		for (var s=0; s<section.length; s++) {
			var c = extend({}, context, section[s]);
			logObj("\n\nContext for "+name+"#"+s+": \n", c);l("\n\n")
			strings.push(_render(tokens, c, options));
		}
		return strings.join('')
	} else if (isString(section)) {
		// special case. section has rendered itself.
		return section;

	} else if (isObject(section)) {
		// the section is it's own context
		var c = extend({}, context, section);
		return _render(tokens, c, options)
	} else {
		throw new Error("Unexepected. Cannot render section name '" + name + "'");
		return section.toString();
	}

}

function _renderSection(token, context, options, isSection) {
	var currentContext = _getContext(context, token);
	var section = _findValue(token.name, currentContext, false);
	if (isFunction(section)) {
		section = section.call(currentContext, function(text) {
			// 1. we pass a 'render function' to the function
			// 2. if called, we render using current information and return a string
			// NB: that the function may NOT call this and just return an array OR a string or falsish. This is fine either way
			return _render(text, currentContext, options);
		})
	}

	// yeah. sorry. A mind futz ensues....
	var okSection = false; // is the main 'section.tokens' array good to be used?
	if (isSection) // non-inverted
		okSection = !isFalsy(section);
	else  // inverted
		okSection = isFalsy(section);
	if (!section)
		section = {};

	if (okSection) {
		// render using the main tokens
		return _filterValue(_renderSectionTokens(token.name, token.data.tokens, section, currentContext, options),currentContext, token)
	}
	else {
		// render using the 'else' tokens, if present, otherwise empty string
		if (token.data.elseTokens)
			return _filterValue(_renderSectionTokens("else " + token.name, token.data.elseTokens, section, currentContext, options), currentContext, token)
		else
			return '';
	}

}

function _render(tokens, context, options) {
	if (tokens instanceof __Tokens)
		throw new Error("Internal class should not be exposed!") ; // tokens = tokens.tokens; // when rendering, just use the raw array.

	var currentContext = context;
	var strings = [];
	for (var t=0; t<tokens.length; t++) {
		var token = tokens[t];
		logObj("TOKEN: " + token.type, token)
		switch (token.type) {
			case TOKEN.TEXT: 
				strings.push(token.data);
				break;

			case TOKEN.VALUE: 
				currentContext = _getContext(context, token);
				strings.push(_filterValue(_findValue(token.name, currentContext), currentContext, token));
				break;

			case TOKEN.SECTION_START:
				strings.push(_renderSection(token, context, options, true));
				break;
			case TOKEN.SECTION_NOT:
				strings.push(_renderSection(token, context, options, false));
				break;

			case TOKEN.PARTIAL:
		}
	}

	return strings.join('');
}


function parse(template, options) {
	options = extend({tag_start:"{{",tag_end:"}}"}, options||{});
	var tokens = _parse(template, options);
	logObj("\n\nParse tokens: \n", tokens)
	return tokens;
}


function render(template_or_tokens, context, options) {
	options = extend({tag_start:"{{",tag_end:"}}"}, options||{});
	if (options.log === true) l = console.log;
	if (!context || !isObject(context)) throw new Error("Invalid params. Context not specified");

	if (isString(template_or_tokens))
		template_or_tokens = _parse(template_or_tokens, options);
	
	if (!isArray(template_or_tokens))
		throw new Error("Unexpected invalid params. template needs to be a string, or a previously parsed object")

	return _render(template_or_tokens, context, options);

}


module.exports = {
	parse: parse,
	render: render
}















