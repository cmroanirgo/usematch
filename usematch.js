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
function isNumeric(x) { return typeof x === 'number'; }
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
			for (var key in add) {
				dest[key] = add[key];
			}
			/*var keys = Object.keys(add)
			var i = keys.length
			while (i--) {
				dest[keys[i]] = add[keys[i]]
			}*/
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

/* mustache version: dont know why they bother with ',='. It's probably why ppl wanted to override it!
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
 */
function encodeHTML(s) 
{
    return s.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;');
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
	if (remove_subCaptures)
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
* Was hoping to avoid the use of eval(), but JSON is too restrictive & HJSON is too 'look I have no commas'...
*/

function _toJS(str) {
	var re_baddies = /(?:\beval\s*\(|\bjavascript\:|\bfunction\s+\w+\s*\(|\bfunction\s*\()/
		// \beval\s*\(  == search for 'eval(', 'eval ('
		// \bjavascript:\(  == search for 'javascript:'
		// \bfunction\s*\w*\( == search for 'function(', 'function word_1 (', etc' 
	if (re_baddies.test(str))
		throw new SyntaxError('Bad syntax. Probable attempt at injecting javascript');
	return eval("(function(){return " + str + ";})()");
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
__MATCHES.PARAMETERS=         /(?:\s+(.+?))??\s*/ // this is 'to the right' of a tag's name
__MATCHES.SECTION_START= _reM(/ *\# *(NAME)PARAMETERS/)
__MATCHES.SECTION_END=   _reM(/ *\/ *(NAME)PARAMETERS/)
__MATCHES.SECTION_NOT=   _reM(/ *\^ *(NAME)PARAMETERS/)
__MATCHES.SECTION_ELSE=       / *(?:ELSE|else)\s*/
__MATCHES.PARTIAL=       _reM(/ *\> *(NAME)PARAMETERS/)
__MATCHES.COMMENT=       _reM(/ *\![\s\S]*?/)
__MATCHES.VALUE=         _reM(/ *(NAME)PARAMETERS/)
__MATCHES.RAW=           _reM(/ *\& *(NAME)PARAMETERS/)
__MATCHES.RAW_BRACED=    _reM(/ *\{ *(NAME) *\} */),
__MATCHES.TAG_CHANGE=         /\=([\S]{1,10}) +([\S]{1,10})\=/  // note the SPACE literal ' '+, rather than \s+

var PARAMETER_MATCHES = { 
	FILTER:        _reM(/^\s*\#(NAME)(?:\s*|$)/),
	CONTEXT_REF:   _reM(/^\s*\&(NAME)(?:\s*|$)/),
	CONTEXT:            /^\s*(\{.*\})(?:\s+|$)/ 
};

function _reM(re) { return _reFriendlyA(re, ['NAME', 'PARAMETERS'], [__MATCHES.NAME, __MATCHES.PARAMETERS], false); }



/**
* A simple string scanner that is used by the template parser to find
* tokens in template strings.
* Lifted from mustache (with heapsa changes). 
*/
function Scanner(text) {
	this.text = text;
	this.prevPos = -1;
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
		this.prevPos = this.pos;
		this.pos += str.length; 
		if (fn)
			fn.apply(null, this.last_match.slice(1));	
	};
	return this.last_match;
};

/**
* Skips all text until the given regular expression can be matched. Returns
* the skipped string, which is the entire tail if no match can be made.
*/
Scanner.prototype.scanUntil = function scanUntil (re, required) {
	if (!re) throw new Error("Missing Regular Expression")
	var index = this.text.search(re), match;
	this.last_scan = index;
	switch (index) {
	  case -1:
	  	if (!required) {
		    match = this.text;
		    this.text = '';
		    break;
		}
		// else fall thru

	  case 0:
	    match = '';
	    break;
	  default:
	    match = this.text.substring(0, index);
	    this.text = this.text.substring(index);
	}

	this.prevPos = this.pos;
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
	var tok = { type: type, name:name, data: data, params: parameters};
	this.tokens.push(tok);
	return tok;
};
__Tokens.prototype.close = function() { // make this class readonly & return just the array
	var tokens = this.tokens;
	this.tokens = null
	return tokens;
};


function _parse(template, options) {
	if (options.log === true) l = console.log;
	var scanner = new Scanner(template);
	var _rootTokens = new __Tokens();
	var sections = []; // {section:Token, tokens:Tokens} where 'tokens' is a reference to either section.data.tokens OR section.data.elseTokens
	var tokens = _rootTokens;
	var current_options = options;


	// re make our matches to be surrounded by the current start and end tags (normally {{ and }})
	function makeMATCHES(options) {
		var m = {
			// special RegExp. It's the one that matches all the other RegExps :)
			TAG_START:    new RegExp(_reEscape(options.tag_start)),
			TAG_END:    new RegExp(_reEscape(options.tag_end)),
		}
		for (var key in __MATCHES) {
			// for the other RegExps, turn them into ^{{...}}
			m[key] = new RegExp("^" + _reEscape(options.tag_start) + _rePrepSubMatch(__MATCHES[key]) + _reEscape(options.tag_end))
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
				data.context = _toJS(json); // JSON.parse(json);
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



	function beginSection(name, parameters, isSection, options) {
		var params = readParameters(name, parameters);
		var data = {tokens:new __Tokens(), template:''}
		var sectionToken = tokens.push(isSection ? TOKEN.SECTION_START : TOKEN.SECTION_NOT, name, data, params);
		sections.push({section:sectionToken, tokens: sectionToken.data.tokens, pos:scanner.pos} );
		tokens = sectionToken.data.tokens; // start working in a child token list
	}

	var MATCHES = makeMATCHES(options);
	logObj("MATCHES:\n",MATCHES)
	var loopCheckPos = -1;

	while (!scanner.eos()) {
		logObj("\nScanner state is: \n", scanner)
		var text = scanner.scanUntil(MATCHES.TAG_START);
		if (text.length>0) {
			l("Pushing text block: '" + text.substr(0,100).replace(/\n/g, '\\n') + "'...")
			tokens.push(TOKEN.TEXT, null, text)
		}
		else
		if (!scanner.eos()) {
			var m;
			if (m = scanner.match(MATCHES.TAG_CHANGE, function(start_tag, end_tag) {
				// found: {{=<% %>=}}
				l("Found {{=tag change=}}: '" + start_tag + "' ... '" + end_tag + "'")
				current_options = extend({}, options, { tag_start: start_tag, tag_end: end_tag})
				MATCHES = makeMATCHES(current_options)
				logObj("\n\nNew MATCHES is:\n", MATCHES); l("\n\n");
			})) 
				;
			else if (m = scanner.match(MATCHES.RAW_BRACED, function(name) {
				// found: {{{name}}}
				l("Found raw value {{{...}}}: '" + name + "'")
				tokens.push(TOKEN.VALUE, name, {raw:true});
			}))
				;
			else if (m = scanner.match(MATCHES.SECTION_START, function(name, parameters) {
				// found: {{#name optional_params}}
				l("Found section {{#...}}: '" + name + "'")
				beginSection(name, parameters, true, current_options)
			}))
				;
			else if (m = scanner.match(MATCHES.SECTION_NOT, function(name, parameters) {
				// found: {{^name optional_params}}
				l("Found NOT section {{^...}}: '" + name + "'")
				beginSection(name, parameters, false, current_options)
			}))
				;
			else if (m = scanner.match(MATCHES.SECTION_ELSE, function(name, parameters) {
				// found: {{^name optional_params}}
				l("Found section {{else}}")
				if (!sections.length)
					throw new Error("Found ELSE but no section!")
				var currentSectionInf = sections[sections.length-1];
				var sectionData = currentSectionInf.section.data;
				sectionData.template = template.substr(currentSectionInf.pos, scanner.prevPos-currentSectionInf.pos)
				currentSectionInf.pos = scanner.pos; // reset for the else part
				l("section template is: " + sectionData.template)
				tokens = currentSectionInf.tokens = sectionData.elseTokens = new __Tokens();
			}))
				;
			else if (m = scanner.match(MATCHES.SECTION_END, function(name) {
				// found: {{/name}}
				l("Found end section {{/...}}: '" + name + "'")
				var currentSectionInf = sections.pop();
				if (!currentSectionInf)
					throw new Error("Unexpected end of section: '" +name + "'")
				if (currentSectionInf.section.name != name)
					throw new Error("Expected end of section for '"+currentSectionInf.section.name+"', but got '"+name+"'");
				// 'close' the tokens in the section
				var sectionData = currentSectionInf.section.data;
				sectionData.tokens = sectionData.tokens.close();
				if (!!sectionData.elseTokens) {
					sectionData.elseTemplate = template.substr(currentSectionInf.pos, scanner.prevPos-currentSectionInf.pos)
					l("section elseTemplate is: " + sectionData.elseTemplate)
					sectionData.elseTokens = sectionData.elseTokens.close();
				}
				else
				{
					sectionData.template = template.substr(currentSectionInf.pos, scanner.prevPos-currentSectionInf.pos)
					l("section template is: " + sectionData.template)
				}

				// reset the tokens to the new top of sections, or root
				if (sections.length>0)
					tokens = sections[sections.length-1].tokens;
				else
					tokens = _rootTokens;
			}))
				;
			else if (m = scanner.match(MATCHES.RAW, function(name, parameters) {
				// found: {{&value optional_params}}
				l("Found raw value {{&...}}: '" + name + "'")
				tokens.push(TOKEN.VALUE, name, {raw:true}, readParameters(name, parameters))
			}))
				;
			else if (m = scanner.match(MATCHES.PARTIAL, function(name, parameters) {
				// found: {{>partial optional_params}}
				l("Found partial {{>...}}: '" + name + "'")
				var params = readParameters(name, parameters);
				tokens.push(TOKEN.PARTIAL, name, null, params)
			}))
				;
			else if (m = scanner.match(MATCHES.COMMENT, function() {
				// found: {{! some words}}
				l("Found comment {{!...}}: " + scanner.last_match[0])
				// we eat comments
			}))
				;
			else if (m = scanner.match(MATCHES.VALUE, function(name, parameters) { // this must be at the end. it will match a LOT of the above expressions
				// found: {{value optional_params}}
				l("Found value {{...}}: '" + name + "'")
				tokens.push(TOKEN.VALUE, name, {raw:false}, readParameters(name, parameters))
			}))
				;
			// else it must be just text. loop around
			else {
				text = scanner.scanUntil(MATCHES.TAG_END);
				l("No matches for: '" + scanner.text.substr(0,100).replace(/\n/g, '\\n') +"'...")
				scanner.match(MATCHES.TAG_END); // eat the match
				if (loopCheckPos == scanner.pos) {
					logObj("Aborting due to infinite loop detection:\n", scanner)
					logObj("    Tag Start = ", MATCHES.TAG_START  )
					throw new Error("Unexpected failure to render. Sorry about that, but an infinite loop was aborted.")
				}
				loopCheckPos = scanner.pos;
			}
		}
	}

	if (sections.length)
		throw new Error("Failed to find a closing tag(s) for '"+sections.map(function(inf) { return section.name}).join("', '") +"'")

	return tokens.close(); // always return the native array.
}

// look at the token, & see if we have been given either a context or a contextName & merge that with the given context
function _getContext(context, token) {
	var defaultContext = {};
	if (!!token.params) {
		if (token.params.contextName) {
			var c = _findValue(token.params.contextName, context);
			if (!c)
				throw new Error("Named context reference '" + token.params.contextName + "' not found")
			extend(defaultContext, c);
		}
		else if (token.params.context) {
			extend(defaultContext, token.params.context);
		}
	}
	return extend(defaultContext, context)
}

function _filterValue(value, context, token) {
	if (!token.params || !token.params.filterName)
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
			value = context;
		} else {
			value = context[name];
			lookupHit = true; // hasProperty(context, name);
		}
	}

	if (_callIfFunction && isFunction(value))
		value = value.call(_context);

    return value;
}

function isSimpleObject(o) {
	return o===null || o===undefined || isArray(o) || ['string', 'number', 'boolean', 'function'].indexOf(typeof o)>=0;
}
function _renderSectionTokens(name, tokens, section, context, options) {
	if (!isArray(tokens)) throw new Error("expected a valid tokens array")
	l("\n\n\n\nrenderSectionTokens '"+name+"' begins")
	if (isArray(section) && section.length>0) {
		var strings = [];
		for (var s=0; s<section.length; s++) {
			var c = extend({}, context);
			if (isSimpleObject(section[s]) )
				c['.']=section[s]; // this is a special wierd mustachian thing where a section can be just an array of strings. The inner template is {{.}}
			else
				extend(c, section[s]);
			logObj("\nContext for "+name+"#"+s+": \n", c);l("\n\n")
			strings.push(_render(tokens, c, options));
		}
		return strings.join('')
	} else if (isSimpleObject(section)) {
		// a mustachian weirdness.
		// section is used, but it's defined just as value, (but the inner template refers to itself)
		//.eg {#length} The length is:{{length}}{{/length}}
		// when { length:'hello'}
		//.eg {#some.data.item} The value is:{{.}}{{/some.data.item}}
		// when { some:{data:{item: 3}}}
		var c = extend({}, context);
		c[name] = section; // inject the section name as a value
		c['.'] = section; // ALSO inject the self-referencing value
		return _render(tokens, c, options);

	} else if (isObject(section)) {
		// the section is it's own context
		var c = extend({}, context, section);
		logObj("\nContext for object section "+name+": \n", c);l("\n\n")
		return _render(tokens, c, options)
	} else  {
		// a mustachian weirdness.
		// section is used, but it's defined just as value, (& the inner template refers to itself)
		//.eg {#length} The length is:{{length}}{{/length}}
		l("WARNING! Unexpected")
		throw new Error("Unexepected. Cannot render section name '" + name + "' unknown type = "+ (typeof section));
		var c = extend({}, context);
		c[name] = section; // inject the section name as a value
		return _render(tokens, c, options);
		//throw new Error("Unexepected. Cannot render section name '" + name + "'");
		//return section.toString();
	}
	l("renderSectionTokens '"+name+"'' done\n------------\n")

}

function _renderSection(token, context, options, isSection) {
	var currentContext = _getContext(context, token);
	var section = _findValue(token.name, currentContext);
	if (isFunction(section)) {
		var subRenderFn = function(text, newContext) {
			var c = extend({}, currentContext)

			if (!!newContext) {
				if (isSimpleObject(newContext)) {
					c['.'] = newContext;
					c[token.name] = newContext;
				}
				else
					extend(c, newContext);
			}

			var tokens = _parse(text, options)
			return _render(tokens, c, options);
		}
		if (isSection) {
			return section.call(currentContext, token.data.template, subRenderFn, token.data.elseTemplate)
		}
		else {
			// calling functions in response to a {^section} is not supportable, really -- it just doesn't make sense. 
			// We add some _minimal_ support if there's an 'else' block
			if (!isFalsy(token.data.elseTokens)) {
				// swap the else and not-else templates
				return 	section.call(currentContext, token.data.elseTemplate, subRenderFn, token.data.template)
			}
			else
				throw new Error("Functions for Inverted sections are not supported without an {{else}} block")
		}
	}

	// yeah. sorry. A mind futz ensues....
	var okSection = false; // is the main 'token.data.tokens' array good to be used?
	if (isSection) // non-inverted
		okSection = !isFalsy(section);
	else  // inverted
		okSection = isFalsy(section);

	logObj("\n\n"+(isSection? '' : "^NOT ")+ "Section '"+token.name+"' is ok: " + okSection + "  value=", section);

	if (!section)
		section = {};

	if (okSection) {
		// render using the main tokens
		return _filterValue(_renderSectionTokens(token.name, token.data.tokens, section, currentContext, options), currentContext, token)
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
	var value;
	for (var t=0; t<tokens.length; t++) {
		var token = tokens[t];
		logObj("Rendering Token: \n", token)
		switch (token.type) {
			case TOKEN.TEXT: 
				strings.push(token.data);
				break;

			case TOKEN.VALUE: 
				currentContext = _getContext(context, token);
				value = _findValue(token.name, currentContext);
				if (value===undefined || value===null) 
					value='';
				if (!token.data.raw)
					value = _usematch.escape(value.toString())
				value = _filterValue(value, currentContext, token);
				strings.push(value);
				break;

			case TOKEN.SECTION_START:
				strings.push(_renderSection(token, context, options, true));
				break;
			case TOKEN.SECTION_NOT:
				strings.push(_renderSection(token, context, options, false));
				break;

			case TOKEN.PARTIAL:
				currentContext = _getContext(context, token);
				value = _findValue(token.name, options.partials)
				if (value===null || value===undefined)
					value=''
				strings.push(_render(_parse(value, options), currentContext, options));
				break;
		}
	}

	return strings.join('');
}


function parse(template, options) {
	options = extend({tag_start:"{{",tag_end:"}}"}, options||{});
	var tokens = _parse(template, options);
	//logObj("\n\nParsed tokens: \n", tokens); l('\n\n\n')
	return tokens;
}


function render(template_or_tokens, context, options) {
	options = extend({tag_start:"{{",tag_end:"}}"}, options||{});

	if (options.log === true) 
		l = console.log; 
	else 
		l = function() { }

	if (!context || !isObject(context)) throw new Error("Invalid params. Context not specified");
	if (!!options.defaults)
		context = extend({}, options.defaults, context);

	if (isString(template_or_tokens))
		template_or_tokens = _parse(template_or_tokens, options);
	
	if (!isArray(template_or_tokens))
		throw new Error("Unexpected invalid params. template needs to be a string, or a previously parsed object")

	l('\n\n\n\n==========\nRendering')
	return _render(template_or_tokens, context, options);

}

var _mustacheCache = {};
var _usematch = {
	escape: function(s) { 
			return _usematch.mustache.escape(s); // seems crazy, but keeps the peace with compatibility
		},
	parse: parse,
	render: render,
	mustache: // mustache direct compatibility layer. eg var mustache = require('usematch').mustache;
		{ 
			tags: [ '{{', '}}' ],
			escape: encodeHTML,
			clearCache: function() { _mustacheCache = {}; },
			parse: function(template, tags, _hiddenOptions) {
				var options = extend({},_hiddenOptions) || {};
				if (!!tags && isArray(tags)) {
					options.tag_start = tags[0];
					options.tag_end = tags[1];
				} else {
					options.tag_start = _usematch.mustache.tags[0];
					options.tag_end = _usematch.mustache.tags[1];
				}
				var tokens = parse(template, options);
				_mustacheCache[template] = tokens;
				return tokens;
			},

			render: function(template, context, partials, _hiddenOptions) {
			    if (typeof template !== 'string')
			      throw new TypeError('Invalid template! Template should be a "string" for mustache.render()');
				var options = extend({},_hiddenOptions) || {};
				options.partials = partials;
				options.tag_start = _usematch.mustache.tags[0];
				options.tag_end = _usematch.mustache.tags[1];
				var tokens = _mustacheCache[template];
				if (!tokens) {
					tokens = _mustacheCache[template] = parse(template, options);
				}
				return render(tokens, context, options)
			}
		}
}
module.exports = _usematch;















