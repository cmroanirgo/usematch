# usematch

**An anagram of Mustache**

[![npm Package](https://img.shields.io/npm/v/usematch.svg)](https://www.npmjs.org/package/usematch)
[![build status](https://secure.travis-ci.org/cmroanirgo/usematch.svg)](http://travis-ci.org/cmroanirgo/usematch)


## Features
This is a code/template compatible replacement for mustache. T

It has a lot more flexibility over the original engine:

- `An {{else}}` block for #ifish blocks and ^not-ifish blocks:
	+ `{{#value} ... {{else} ... {{/value}`
  	+ `{{^value}  ... {{else}} ... {{/value}}`

- default context values for everything, defined in the template:
	+ `{{name {name:'John Doe'} }}`
	+ `{{#posts {bg_image:'/images/bg.jpg'} }}`
	+ `{{>post_page {author: 'John Doe'} }}`
	+ __See also references below__

- filters on everything:
	+ `{{name #toUpper}}` or `{{name | toUpper}}`: (synonymous)
		```js
		eg: var o = {
			name: "John Doe",
			toUpper: function(value) { return value.toUpperCase(); }; // 'JOHN DOE'
		}
		```

	+ `{{title #xmlEscape}}`, or `{{#posts #xmlEscape}}`, or `{{>posts #xmlEscape}}`
		```js
		for var o = {
			posts: [
				{title:'first post' ... },
				{title:'second post' ... }
			],
			xmlEscape: function(text) { return text.replace(/&/g, '&amp;')....; }; 
		}
		```
	+ parameters, eg. `{{tags | split{char:','} | join }}`
		```js
		for var o = {
			tags: 'tag1, tag2, tag3',
			split: function(text, params) { 
				return text.split(params.char||',').map(
						function(s) { return s.trim(); }); 
				}, 
			join: function(ar, params) { return ar.join(params.char||' | '); },
		}
		```

- data filters on sections:
	+ `{{#posts @dataFilter}}{{title}}{{/posts}}`
		```js
		eg: var o = {
			posts: [
				{title:'first post', bg_image:'/images/custom_bg.jpg', ... },
				{title:'second post' ... }
			],
			dataFilter: function(posts, params) { 
				return posts.slice(0,1).map(function(post) { return post.title.toUpperCase(); });
			};
		}
		```

	+ Automagic data filtering with `prefilter.<section>`. eg. `{{#posts}}{{title}}{{/posts}}`:
		```js
		eg: var o = {
			posts: [ ... ],
			prefilter: {
				posts: function(posts, params) { 
					return posts.slice(0,1).map(function(post) { return post.title.toUpperCase(); });
				}
			}
			// OR:
			// 'prefilter.posts' : function(....
		}
		```
	+ Parameters to data filters `{{#posts @customFilter{len:10} }}{{title}}{{/posts}}`
		```js
		eg: var o = {
			posts: [ ... ],
			customFilter: function(posts, params) { 
				return posts.slice(0,params.len || 5);
			};
		}
		```

- sections can be functions too (like mustache). (They must return either a string, OR an array of objects):
	+ `{{#posts}} ... {{/posts}}`

	 	```js
	 	eg: var o = {
			posts: function() { 
				return [
						{title:'first post' ... },
						{title:'second post' ... }
					] 
				}
	 		}
	 	```
	 	
	 	Or, return a 'renderable' item:
	 	```js
	 	eg: var o = {
			posts: function() { return function(text, render, elseText) {
				return render( "some fantastic {{title}}", 
						[			
							{title:'first post' ... },
							{title:'second post' ... }
						] 					
					 );
				}}
			}
	 	```
- Iterate any object by key/value:
	+ `{{#tags.*}}Tag:{{key}} Items:{{#value}}{{title}}{{/value}}{{/tags.*}}`
	 	```js
	 	eg: var o = {
				tags: {
					tag1: [
						{title:'first post'},
						{title:'2nd post'},
					],
					tag2: [
						{title:'first post'},
						{title:'3rd post'},
					]
				}
	 		}
	 	```
- References:
	+ default contexts can also be a reference `{{#posts &default_post}}{{upperTitle}}{{/posts}}`:
		```js
		eg: var o = {
				posts: [
					{title:'first post', bg_image:'/images/custom_bg.jpg', ... },
					{title:'second post' ... }
				],
				default_post: {
					bg_image: '/images/bg.jpg'
					upperTitle: function() { return this.title.toUpperCase() } // eg. 'FIRST POST'
				}
			}
		```
	+ include/partials as a reference `{{> &menu_name }}`:
		```js
		eg: var o = {
				menu_name: "navbar-menu.html"
			}
		```
- Fallback values. Rather than using `{{#val}}{{val}}{{else}}{{othervalue}}{{/val}}` use:
	+ `{{val || othervalue}}`

## Usage

```js
const usematch = require('usematch');

console.log(usematch.render('{{title}}', {title:"Awesome!"})); 
// prints 'Awesome!'
```


For a complete 'drop-in' replacement api of mustache, use:

```js
var Mustache = require('usematch').mustache;

... (your existing code works here without change) ...
```

## API

There are actually two API's provided by this package. Usematch's own and a code compatible Mustache one. Use the latter when porting an existing project. It is recommended to use the Usematch API if you want to be able have tighter control over the system (as there are a lot more options you can tweak).

### Usematch API

```js
var usematch = require("usematch");

var context = {
  title: "Joe",
  calc: function () {
    return 2 + 4;
  }
};

var output = usematch.render("{{title}} spends {{calc}}", context);
```

Following is an [rtype](https://git.io/rtype) signature of the most commonly used functions.

```js
usematch.render(
  template  : String|Tokens,
  context   : Object,
  options?  : Options
) => String

usematch.parse(
  template   : String,
  options?   : Options
) => Tokens

interface Tokens [ Object ];

interface Options { 		// All elements are optional
	tag_start : "{{",
	tag_end   : "}}",
	partials  : Object 		// used with {{> partial_name }}
	defaults  : Object 		// used in conjuction with the 'context' parameter of render()
}
```



### Mustache Compatible API

Usematch uses mustache's own tests to ensure this compatibility is real and effective, and is checked automatically as part of [travis](https://travis-ci.org/cmroanirgo/usematch).

```js
var Mustache = require("usematch").mustache;

var context = {
  title: "Joe",
  calc: function () {
    return 2 + 4;
  }
};

var output = Mustache.render("{{title}} spends {{calc}}", context);
```

Following is an [rtype](https://git.io/rtype) signature of the most commonly used functions.

```js
Mustache.render(
  template  : String,
  context   : Object,
  partials? : Object,
) => String

Mustache.parse(
  template              : String,
  tags = ['{{', '}}']   : Tags,
) => String

interface Tags [String, String]
```

See the [original mustache documentumentation](https://github.com/janl/mustache.js).

## Differences

### Caching
Usematch doesn't try and cache things for you, by default. This can be a huge memory saving in some instances. However, when you use `require('usematch').mustache`, then a basic cache will be activated that works similarly to mustache's original.

You must save the return value of the parse function, in order to save execution time. You could even spool the tokens to disk for later use, if you like.

```js
var tokens = usematch.parse('{{title}}');
var text = usematch.render(tokens, { data: ...})
```

### Whitespace
Mustache does some pretty crazy things in order to reduce the generated whitespace. This can be problematic if not rendering HTML, so usematch doesn't try to do this. If you want to clean up the returned text, then something like this should suffice:

```js
// eat all whitespace that appear more than once in a sequence
text = text.replace(/\s{2,}/g, ' '); 
```

Or:

```js
// remove all whitespace around newlines. (this also reduces \n\n)
text = text.replace(/\s*\n\s*/g, '\n'); 
```

## Why?

When writing a new [CMS package](https://github.com/ergo-cms/), I was dismayed how mustache failed to suit my needs, despite the impressive following it has. Mostly, was the lack of the ability to set 'defaults', which was a complete deal breaker for me. Although not a fan of mustache's double handlebar syntax, I understood however that others were very happy with the formatting. Hence, this drop in mustache compatible alternative was created. Feel free to fork, or add comments, or report bugs.
