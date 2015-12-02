"use strict";

var STORAGE_KEY_HISTORY = "history";
var STORAGE_KEY_DATA = "data";
var MAX_HISTORY_LENGTH = 10;
var ID_PREFIX = "hisotory-";
var OBSERVATION_INTERVAL = 300; // [ms]

var container = document.getElementById("container");

new Promise(function (resolve, reject) {
	var keys = {};
	// デフォルト値: []
	keys[STORAGE_KEY_HISTORY] = [];
	keys[STORAGE_KEY_DATA] = {};
	chrome.storage.local.get(keys, function (items) {
		var history = items[STORAGE_KEY_HISTORY];
		var data = items[STORAGE_KEY_DATA];
		var clipBoardHistory = new ClipBoardHistory(history, data);
		resolve(clipBoardHistory);
	});
}).then(function (clipBoardHistory) {
	var latestClipboardText = clipBoardHistory.latest();
	clipBoardHistory.forEach(function (clipboardText, id) {
		appendHistory(clipboardText, id, clipBoardHistory);
	});
	window.setInterval(function () {
		var clipboardText = ClipboardConnector.get();
		if (latestClipboardText !== clipboardText) {
			latestClipboardText = clipboardText;
			// 先頭に追加
			var id = clipBoardHistory.add(clipboardText);
			appendHistory(clipboardText, id, clipBoardHistory);
		}
	}, OBSERVATION_INTERVAL);
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

class ClipBoardHistory {
	constructor(history, data) {
		this.history = history;
		this.data = data;
		this.eventListenerMap = {
			remove: []
		};
	}
	
	add(clipboardText) {
		var id = Date.now();
		
		this.history.push(id);
		this.data[id] = clipboardText;
		
		this.cutoff(MAX_HISTORY_LENGTH);
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
		items[STORAGE_KEY_HISTORY] = this.history;
		items[STORAGE_KEY_DATA] = this.data;
		chrome.storage.local.set(items);
	}
	
	addEventListener(type, listener) {
		if (typeof listener === "function") {
			this.eventListenerMap[type].push(listener);
		}
	}
}

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