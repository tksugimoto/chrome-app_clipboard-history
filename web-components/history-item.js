(function (window, document) {
	"use strict";
	
	var thatDoc = document;
	var thisDoc = thatDoc.currentScript.ownerDocument;
	
	var template = thisDoc.querySelector('template').content;
	
	var MyElementProto = window.Object.create(window.HTMLElement.prototype);

	MyElementProto.createdCallback = function () {
		var clone = thatDoc.importNode(template, true);
		this.appendChild(clone);
		
		var forEach = window.Array.prototype.forEach;
		forEach.call(this.querySelectorAll("button"), (button) => {
			button.addEventListener("click", () => {
				var event = new window.Event(button.getAttribute("data-type"));
				this.dispatchEvent(event);
			});
		});
	};
	
	MyElementProto.setText = function (text) {
		var pre = this.querySelector("pre");
		pre.innerText = text;
	};
	
	MyElementProto.removeButton = function (type) {
		if (/^[a-z]+$/i.test(type)) {
			var elem = this.querySelector(`button[data-type="${type}"]`);
			if (elem) elem.parentNode.removeChild(elem);
		}
	};
	
	thatDoc.registerElement("history-item", {
		prototype: MyElementProto
	});
})(window, document);