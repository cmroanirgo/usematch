({
	tags: ' tag 1       ,tag 2  ,  tag 3    ',
	split: function(text, params) {
		return text.split(params.char||',').map(
			function(s) { return s.trim(); });
	},
	join: function(ar, params) {
		return ar.join(params.char||' | ');
	},
})