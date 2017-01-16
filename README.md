# usematch

**An anagram of Mustache**

[![npm Package](https://img.shields.io/npm/v/usematch.svg)](https://www.npmjs.org/package/usematch)
[![build status](https://secure.travis-ci.org/cmroanirgo/usematch.svg)](http://travis-ci.org/cmroanirgo/usematch)


## Features
This is a code/template compatible replacement for mustache. The only difference will be in whitespaces, but passes mustaches' own tests otherwise.


It has a lot more flexibility over the original engine:

- {{else}} block for #ifish blocks and ^not-ifish blocks:
	+ {{#value} ... {{else} ... {{/value} 
  	+ {{^value}  ... {{else}} ... {{/value}}

- default context values for everything, defined in the template:
	+ {{name {name:'John Doe'} }}
	+ {{#posts {bg_image:'/images/bg.jpg'} }}
	+ {{>post_page {author: 'John Doe'} }}

	- default contexts can also be a reference:
		+ {{#posts &default_post}}{{upperTitle}}{{/posts}}
		```
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
- filters on everything:
	+ {{name #toUppper}}
		```
		eg: var o = {
			name: "John Doe",
			toUpper: function(value) { return value.toUpperCase(); }; // 'JOHN DOE'
		}
		```

	+ {{#posts #xmlEscape}}, or {{>posts #xmlEscape}}
		```
		for var o = {
			posts: [
				{title:'first post' ... },
				{title:'second post' ... }
			],
			xmlEscape: function(text) { return text.replace(/&/g, '&amp;')....; }; // 
		}
		```

- sections can be functions too (like mustache). (They must return either a string, OR an array of objects):
	+ {#posts} ... {/posts}
	 	```
	 	eg: var o = {
			posts: function(render) {
				this.db_retrieve_posts...
				return [
						{title:'first post' ... },
						{title:'second post' ... }
					] 
				}
	 		}
	 	```

	 	```
	 	eg: var o = {
			posts: function(render) {
				return render( "some fantastic {{title}}", 
						[			
							{title:'first post' ... },
							{title:'second post' ... }
						] 					
					 );
				}
	 		}
	 	```

## Usage

```
const usematch = require('usematch');

console.log(usematch.render('{{title}}', {title:"Awesome!"}))); // prints 'Awesome!'
```


For a complete 'drop-in' replacement api of mustache, use:

```
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
Mustache.render(
  template  : String|Tokens,
  context   : Object,
  options?  : Options
) => String

Mustache.parse(
  template              : String,
  tags = ['{{', '}}']   : Tags,
) => Tokens

interface Tokens [ Object ]

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
  view      : Object,
  partials? : Object,
) => String

Mustache.parse(
  template              : String,
  tags = ['{{', '}}']   : Tags,
) => String

interface Tags [String, String]
```

See also the [original documentumentation](https://github.com/janl/mustache.js).

## Differences

### Caching
Usematch doesn't try and cache things for you, by default. This can be a huge memory saving in some instances. However, when you use `require('usematch').mustache`, then a basic cache will be activated that works similarly to mustache's original.

You must save the return value of the parse function, in order to save execution time. You could even spool the tokens to disk for later use, if you like.

```
var tokens = usematch.parse('{{title}}');
var text = usematch.render(tokens, { data: ...})
```

### Whitespace
Mustache does some pretty crazy things in order to reduce the generated whitespace. This can be problematic if not rendering HTML, so usematch doesn't try to do this. If you want to clean up the returned text, then something like this should suffice:

```
text = text.replace(/\s{2,}/g, ' '); // eat all whitespace that appear more than once in a sequence
```

Or:

```
text = text.replace(/\s*\n\s*/g, '\n'); // remove all whitespace from and around newlines. (this also reduces \n\n)
```

