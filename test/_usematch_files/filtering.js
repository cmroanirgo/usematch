({
	title: "Test 5",
	posts: [
		{ title: "First Post!", content: "Oh yeah!" },
		{ title: "Second Post!", content: "Oh yeah, but not as much!" },
	],
	postNum: function() { 
			return (this.posts.findIndex(
						function(post) { return post.title==this.title; }, 
						this)
					)+1; },
	indentor: function(value) {
		return "> " + value.toString().split('\n').join('\n> ');
	}

})
