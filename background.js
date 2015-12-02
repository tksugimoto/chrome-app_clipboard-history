
chrome.app.runtime.onLaunched.addListener(function(launchData) {
	chrome.app.window.create("index.html", {
		"id": "__",
		"bounds": {
			"width":  400,
			"height": 600,
			"top":  0,
			"left": 0
		}
	});
});
