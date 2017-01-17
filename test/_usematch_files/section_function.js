({
	title: "Test 4",
	posts: function() {
		return [
			{ title: "First Post!", content: "Oh yeah!"},
			{ title: "Second Post!", content: "Oh yeah, but not as much!"},
		];
	},
	postNum: function() { 
			return (this.posts().findIndex(
						function(post) { return post.title==this.title; }, 
						this)
					)+1; }

})
