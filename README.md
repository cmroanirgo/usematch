# usematch

**An anagram of Mustache**


## Intro
This is a code/template compatible replacement for mustache. But it has a lot more flexibility over the original engine:

- {{else}} block for #ifish blocks and ^not-ifish blocks:
	+ {{#value} ... {{else} ... {{/value} 
  	+ {{^value}  ... {{else}} ... {{/value}}

- default context values for everything:
	+ {{name {'John Doe'}}}
	+ {{#posts {bg_image:'/images/bg.jpg'}}}
	+ {{>post_page {author: 'John Doe'}}}

	- default contexts can also be a reference:
		+ {{#posts &default_post}}
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

- sections can be functions too. (They must return either a string, OR an array of objects):
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
	 	

