var Conn = require('./conn');
var TermView = require('./termview');
var TermBuf = require('./termbuf');
var AnsiParser = require('./ansiparser');
// Main Program

function PCMan(config) {
	this.conn = new Conn(this, config.sender, config.encoder);
	this.view = new TermView(config.view, config.input, config.decoder, config.opener);
	this.buf=new TermBuf(80, 24);
	this.buf.setView(this.view, config.decoder);
	this.view.setBuf(this.buf);
	this.view.setConn(this.conn);
	this.parser=new AnsiParser(this.buf);
	//this.menu=new ContextMenu(this, document.getElementById("contextmenu"));
	//this.prefs=new PrefHandler(this);
	//this.setMenu();
	//this.prefs.observe(true);
}

PCMan.prototype={

	receive: function(data) {
		var content = String.fromCharCode.apply(null, new Uint8Array(data)); // BUFFER!
		this.conn.onDataAvailable(content);
	},
	resize: function() {
		this.view.onResize();
	},
	close: function() {
		if(this.conn.app.ws) {
			this.abnormalClose = true;
			this.conn.close();
		}

		this.view.removeEventListener();

		removeEventListener('contextmenu', this.menu.observer, false);
		this.prefs.observe(false);

		// added by Hemiola SUN
		this.view.blinkTimeout.cancel();
	},

	onConnect: function(conn) {
		this.updateTabIcon('connect');
	},

	onData: function(conn, data) {
		this.parser.feed(data); // parse the received data
		this.view.update(); // update the view
	},

	onClose: function(conn) {
		if(this.abnormalClose) return;

		this.updateTabIcon('disconnect');
	},

	copy: function(selection){
		if(selection/* && this.os == 'WINNT'*/)
			return; // Windows doesn't support selection clipboard

		if(this.view.selection.hasSelection()) {
			var text = this.view.selection.getText();

			var _this = this;
			this.conn.app.copy(text, function() {
				var evt = document.createEvent("HTMLEvents");
				evt.initEvent('copy', true, true);
				_this.view.input.dispatchEvent(evt);
			});
			this.view.selection.cancelSel(true);
		}
	},

	paste: function(selection) {
		if(selection/* && this.os == 'WINNT'*/)
			return; // Windows doesn't support selection clipboard

		var _this = this;
		this.conn.app.paste(function(text) {
			if(!text)
				return;

			text = text.replace(/\r\n/g, '\r');
			text = text.replace(/\n/g, '\r');
			text = text.replace(/\x1b/g, '\x15');

			var charset = _this.prefs.Encoding;
			_this.conn.convSend(text, charset);
		});
	},

	selAll: function() {
		this.view.selection.selectAll();
	},

	search: function(engine) {
		if(!this.view.selection.hasSelection())
			return;
		var text = this.view.selection.getText();

		var search = "http://www.google.com/search?q=%s";
		switch(engine) {
		case 'Yahoo!':
			search = "http://search.yahoo.com/search?ei=utf-8&fr=crmas&p=%s";
			break;
		case 'Bing':
			search = "http://www.bing.com/search?setmkt=" + navigator.language + "&q=%s";
			break;
		default:
		}
		openURI(search.replace(/%s/g, encodeURIComponent(text)), true);
		this.view.selection.cancelSel(true);
	},

	updateTabIcon: function(aStatus) {
	  var icon = 'icon/tab-connecting.png';
	  switch (aStatus) {
		case 'connect':
		  icon =  'icon/tab-connect.png';
		  break;
		case 'disconnect':
		  icon =  'icon/tab-disconnect.png';
		  break;
		case 'idle':  // Not used yet
		  icon =  'icon/tab-idle.png';
		  break;
		case 'connecting':  // Not used yet
	  break;
		default:
	  }

	  var link = document.querySelector("link[rel~='icon']");
	  if(!link) {
		  link = document.createElement("link");
		  link.setAttribute("rel", "icon");
		  link.setAttribute("href", icon);
		  document.head.appendChild(link);
	  } else {
		  link.setAttribute("href", icon);
	  }
	},

	/*setMenu: function() {
		var _this = this;
		this.menu.items['menu_copy'].action = function() { _this.copy(); };
		this.menu.items['menu_paste'].action = function() { _this.paste(); };
		this.menu.items['menu_selAll'].action = function() { _this.selAll(); };
		this.menu.items['menu_search'].menu.items['search_google'].action =
			function() { _this.search(); };
		this.menu.items['menu_search'].menu.items['search_yahoo'].action =
			function() { _this.search('Yahoo!'); };
		this.menu.items['menu_search'].menu.items['search_bing'].action =
			function() { _this.search('Bing'); };
		this.menu.items['menu_sitepref'].action = function() {
			var url = document.location.hash.substr(1);
			if(!url) url = 'ptt.cc';
			openURI('options.htm?url=' + url, true);
		};

		this.menu.oncontextmenu = function(event) {
			var isSel = _this.view.selection.hasSelection();
			_this.menu.items['menu_copy'].disable(!isSel);
			_this.menu.items['menu_search'].disable(!isSel);
		};

		addEventListener('contextmenu', this.menu.observer, false);
	}*/
};

module.exports = PCMan;
