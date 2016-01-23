"use strict";


class ClipBoardHistory {
	constructor(key, maxHistoryLength) {
		var prefix = key ? key + "-" : "";
		this.key = {
			history: prefix + "history",
			data: prefix + "data"
		};
		this.maxHistoryLength = maxHistoryLength;
		this.eventListenerMap = {
			remove: [],
			add: []
		};
	}
	
	add(clipboardText) {
		var id = Date.now();
		
		this.history.push(id);
		this.data[id] = clipboardText;
		
		if (this.maxHistoryLength > 0) {
			this.cutoff(this.maxHistoryLength);
		}
		this.save();
		this.eventListenerMap.add.forEach((fn) => {
			fn(clipboardText, id);
		});
		
		return id;
	}
	
	latest() {
		var len = this.history.length;
		if (len > 0) {
			return this.data[this.history[len - 1]];
		} else {
			return null;
		}
	}
	
	remove(id) {
		delete this.data[id];
		var index = this.history.indexOf(id);
		if (index !== -1) {
			this.history.splice(index, 1);
		}
		this.eventListenerMap.remove.forEach((fn) => {
			fn(id);
		});
		// TODO: save()の効率化
		this.save();
	}
	
	cutoff(remainLength) {
		var removedHistory = this.history.splice(0, this.history.length - remainLength);
		removedHistory.forEach((id) => {
			// 少し無駄
			this.remove(id);
		});
	}
	
	forEach(fn) {
		// arrow演算子を使えばself = thisを使わなくて良い
		this.history.forEach((id) => {
			fn(this.data[id], id);
		});
	}
	
	save() {
		var items = {};
		items[this.key.history] = this.history;
		items[this.key.data] = this.data;
		chrome.storage.local.set(items);
	}
	load() {
		var keys = {};
		// デフォルト値: []
		keys[this.key.history] = [];
		keys[this.key.data] = {};
		var callback = (items, resolve) => {
			this.history = items[this.key.history];
			this.data = items[this.key.data];
			resolve();
		};
		return new Promise(function (resolve, reject) {
			chrome.storage.local.get(keys, function (items) {
				callback(items, resolve);
			});
		});
	}
	
	addEventListener(type, listener) {
		if (typeof listener === "function") {
			this.eventListenerMap[type].push(listener);
		}
	}
}

/*******************************************/

var MAX_HISTORY_LENGTH = 10;
var ID_PREFIX = "hisotory-";
var OBSERVATION_INTERVAL_MS = 300; // [ms]

var historyContainer = document.getElementById("history-container");
var memoContainer = document.getElementById("memo-container");

new Promise(function (resolve, reject) {
	var clipBoardHistory = new ClipBoardHistory("", MAX_HISTORY_LENGTH);
	var clipBoardMemo = new ClipBoardHistory("memo", 0);
	Promise.all([
		clipBoardHistory.load(),
		clipBoardMemo.load()
	]).then(function () {
		resolve({
			clipBoardHistory: clipBoardHistory,
			clipBoardMemo: clipBoardMemo
		});
	});
}).then(function (arg) {
	var clipBoardHistory = arg.clipBoardHistory;
	var clipBoardMemo = arg.clipBoardMemo;
	startHistory(clipBoardHistory, clipBoardMemo);
	startMemo(clipBoardMemo);
});

function startHistory(clipBoardHistory, clipBoardMemo) {
	var latestClipboardText = clipBoardHistory.latest();
	clipBoardHistory.forEach(appendHistory);
	window.setInterval(function () {
		var clipboardText = ClipboardConnector.get();
		if (clipboardText && latestClipboardText !== clipboardText && clipBoardHistory.latest() !== clipboardText) {
			latestClipboardText = clipboardText;
			// 先頭に追加
			var id = clipBoardHistory.add(clipboardText);
			appendHistory(clipboardText, id);
		}
	}, OBSERVATION_INTERVAL_MS);
	clipBoardHistory.addEventListener("remove", function (id) {
		var elem = document.getElementById(ID_PREFIX + id);
		if (elem) {
			elem.parentNode.removeChild(elem);
		}
	});

	function appendHistory(clipboardText, id) {
		append(historyContainer, clipboardText, id, function () {
			latestClipboardText = clipboardText;
			ClipboardConnector.set(clipboardText);
		}, function () {
			clipBoardHistory.remove(id);
		}, function () {
			clipBoardMemo.add(clipboardText);
		});
	}
}


function startMemo(clipBoardMemo) {
	clipBoardMemo.forEach(appendMemo);
	clipBoardMemo.addEventListener("add", appendMemo);
	clipBoardMemo.addEventListener("remove", function (id) {
		var elem = document.getElementById(ID_PREFIX + id);
		if (elem) {
			elem.parentNode.removeChild(elem);
		}
	});

	function appendMemo(clipboardText, id) {
		append(memoContainer, clipboardText, id, function () {
			ClipboardConnector.set(clipboardText);
		}, function () {
			clipBoardMemo.remove(id);
		}, null);
	}
}

function append(container, text, id, copyCallback, deleteCallback, add2memoCallback) {
	var elem = document.createElement("history-item");
	elem.id = ID_PREFIX + id;
	elem.classList.add("clearfix");
	
	
	elem.setText(text);
	
	elem.addEventListener("copy", copyCallback);
	
	if (add2memoCallback) {
		elem.addEventListener("addMemo", add2memoCallback);
	} else {
		elem.removeButton("addMemo");
	}
	
	elem.addEventListener("delete", deleteCallback);
	
	container.insertBefore(elem, container.firstChild);
}
/**********************************************/


var ClipboardConnector = (function () {
	var clipboardConnectorInput = document.getElementById("clipboardConnectorInput");
	// ※ display: none;だとペーストできない
	function get() {
		clipboardConnectorInput.value = "";
		clipboardConnectorInput.focus();
		document.execCommand("Paste", null, null);
		var clipboardText = clipboardConnectorInput.value;
		return clipboardText;
	};

	function set(text) {
		clipboardConnectorInput.value = text;
		clipboardConnectorInput.select();
		document.execCommand("copy", null, null);
	}
	return {
		get: get,
		set: set
	}
})();

/**********************************************/
document.getElementById("alwaysOnTop").addEventListener("change", function (event) {
	chrome.app.window.current().setAlwaysOnTop(event.checked);
});