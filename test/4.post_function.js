loadAndRunTest(__filename, {
	title: "Test 4",
	posts: function(render) {
		console.log("\tRendering posts as a result of a function!")
		return [
			{ title: "First Post!", content: "Oh yeah!", postNum:1 },
			{ title: "Second Post!", content: "Oh yeah, but not as much!", postNum:2 },
		];
	},
	postNum: function() { 
			// I will blow up if called. because this.posts is a function & NOT an array!
			return (this.posts.findIndex(
						function(post) { return post.title==this.title; }, 
						this)
					)+1; }

});
