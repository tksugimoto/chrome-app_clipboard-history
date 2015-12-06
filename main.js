"use strict";


class ClipBoardHistory {
	constructor(historyKey, dataKey, maxHistoryLength) {
		this.key = {
			history: historyKey,
			data: dataKey
		};
		this.maxHistoryLength = maxHistoryLength;
		this.eventListenerMap = {
			remove: []
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

var STORAGE_KEY_HISTORY = "history";
var STORAGE_KEY_DATA = "data";
var MAX_HISTORY_LENGTH = 10;
var ID_PREFIX = "hisotory-";
var OBSERVATION_INTERVAL_MS = 300; // [ms]

var container = document.getElementById("container");

new Promise(function (resolve, reject) {
	var clipBoardHistory = new ClipBoardHistory(STORAGE_KEY_HISTORY, STORAGE_KEY_DATA, MAX_HISTORY_LENGTH);
	clipBoardHistory.load().then(function () {
		resolve(clipBoardHistory);
	});
}).then(function (clipBoardHistory) {
	var latestClipboardText = clipBoardHistory.latest();
	clipBoardHistory.forEach(function (clipboardText, id) {
		appendHistory(clipboardText, id, clipBoardHistory);
	});
	window.setInterval(function () {
		var clipboardText = ClipboardConnector.get();
		if (latestClipboardText !== clipboardText && clipBoardHistory.latest() !== clipboardText) {
			latestClipboardText = clipboardText;
			// 先頭に追加
			var id = clipBoardHistory.add(clipboardText);
			appendHistory(clipboardText, id, clipBoardHistory);
		}
	}, OBSERVATION_INTERVAL_MS);
	clipBoardHistory.addEventListener("remove", function (id) {
		var elem = document.getElementById(ID_PREFIX + id);
		if (elem) {
			elem.parentNode.removeChild(elem);
		}
	});

	function appendHistory(clipboardText, id, clipBoardHistory) {
		var elem = document.createElement("li");
		elem.id = ID_PREFIX + id;
		elem.innerText = clipboardText;
		elem.classList.add("clearfix");
		
		var buttonContainer = document.createElement("div");
		buttonContainer.classList.add("button-container");
		elem.appendChild(buttonContainer);
		
		var copyButton = document.createElement("button");
		copyButton.innerText = "コピー";
		copyButton.onclick = function () {
			latestClipboardText = clipboardText;
			ClipboardConnector.set(clipboardText);
		};
		buttonContainer.appendChild(copyButton);
		
		var removeButton = document.createElement("button");
		removeButton.innerText = "削除";
		removeButton.onclick = function () {
			clipBoardHistory.remove(id);
		};
		buttonContainer.appendChild(removeButton);
		
		container.insertBefore(elem, container.firstChild);
	}
});
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
document.getElementById("alwaysOnTop").onchange = function (){
	chrome.app.window.current().setAlwaysOnTop(this.checked)
};