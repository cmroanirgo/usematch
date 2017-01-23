function _makePosts() {
	var ar = [];
	for (var i=0; i<30; i++) {
		ar.push({title: "I am post #" + (i+1), order:i, otherOrder:(1000-i)})
	}
	return ar;
}

function _customFilter(posts, params) {
	//console.log("\n\n_customFilter called with params: " + JSON.stringify(params))
	//params = params || {};
	// sort first, then slice (otherwise will only ever get the first 'n' sorted)
	if (params.sortBy || params.sort) {
		params.sort = params.sort||'desc';
		params.sortBy = params.sortBy||'date'; // date deliberately doesn't exit in this test
		var dir = params.sort=='asc' ? 1 : -1;
		posts = posts.sort(function(a,b) {
			return dir*(a[params.sortBy] - b[params.sortBy]);
		})

	}
	if (params.len===undefined && params.sortBy===undefined && params.sort===undefined) {
		//well now, NOTHING was defined. How about we limit the length to test that we got here?
		params.len=15;
	}
	if (params.len!==undefined)
		posts = posts.slice(0, params.len);
	return posts;
}

({
	posts:  _makePosts,
	posts2: _makePosts,
	posts3: _makePosts,
	nested: { posts4: _makePosts },
	prefilter: { // hierarchical decl'
		posts2: _customFilter,
		nested: { posts4: _customFilter} 
		}, 
	'prefilter.posts3': _customFilter, // alternate method of declaration
	postNum: function() { 
			return (this.posts().findIndex(
						function(post) { return post.title==this.title; }, 
						this)
					)+1; },
	customFilter: _customFilter

})
