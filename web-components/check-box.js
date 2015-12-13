(function (window, document) {
	"use strict";
	
	var thatDoc = document;
	var thisDoc = thatDoc.currentScript.ownerDocument;
	
	var template = thisDoc.querySelector('template').content;
	
	var MyElementProto = window.Object.create(window.HTMLElement.prototype);

	MyElementProto.createdCallback = function () {
		this.createShadowRoot();
		
		var clone = thatDoc.importNode(template, true);
		this.shadowRoot.appendChild(clone);
		
		this.checkbox = this.shadowRoot.querySelector("input");
		
		this.checkbox.addEventListener("change", (evt) => {
			if (this.checkbox.checked) {
				this.setAttribute("checked", true);
			} else {
				this.removeAttribute("checked");
			}
			var event = new window.Event("change");
			event.checked = this.checkbox.checked;
			this.dispatchEvent(event);
		});
	};
	
	thatDoc.registerElement("check-box", {
		prototype: MyElementProto
	});
})(window, document);