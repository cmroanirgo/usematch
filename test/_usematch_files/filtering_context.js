({
	title: "Test 6",
	posts: [
		{ title: "First Post!", content: "Oh yeah!" },
		{ title: "Second Post!", content: "Oh yeah, but not as much!", sq:"**" },
	],
	indentor: function(value) {
		return "> " + value.toString().split('\n').join('\n> ');
	}

})
