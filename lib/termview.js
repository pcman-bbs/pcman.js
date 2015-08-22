var TermSel = require('./termsel');
var InputHandler = require('./inputhandler');

function fillTriangle(ctx, x1, y1, x2, y2, x3, y3) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.lineTo(x3,y3);
    ctx.fill();
    ctx.restore();
}

// http://www.unicode.org/cgi-bin/UnihanGrid.pl?codepoint=U+2581&useutf8=true
function tryDrawIdeograph(ctx, ch, x, y, w, h) {
    var code = ch.charCodeAt(0);
    // We can draw some idographic characters with specialized painting code
    // to make them prettier.
    if(code >= 0x2581 && code <= 0x258f) { // ▁▂▃▄▅▆▇█  ▏▎▍▌▋▊▉
        var idx;
        if(code < 0x2589) {
            idx = code - 0x2580;
            y += h;
            h *= (idx/8);
            y -= h;
        }
        else {
            idx = code - 0x2588; // 0x2589 is ▉
            // block width = (1 - idx/8) * cell width
            w *= ((8 - idx) / 8);
        }
        ctx.fillRect(x, y, w, h);
    }
    else if(code >= 0x25e2 && code <= 0x25e5) { // ◢◣◥◤
        var x1, y1, x2, y2, x3, y3;
        switch(code) {
        case 0x25e2: // ◢
            x1 = x;
            y1 = y + h;
            x2 = x + w;
            y2 = y1;
            x3 = x2;
            y3 = y;
            break;
        case 0x25e3: // ◣
            x1 = x;
            y1 = y;
            x2 = x;
            y2 = y + h;
            x3 = x + w;
            y3 = y2;
            break;
        case 0x25e4: // ◤
            x1 = x;
            y1 = y;
            x2 = x;
            y2 = y + h;
            x3 = x + w;
            y3 = y;
            break;
        case 0x25e5: // ◥
            x1 = x;
            y1 = y;
            x2 = x + w;
            y2 = y;
            x3 = x2;
            y3 = y + h;
            break;
        }
        fillTriangle(ctx, x1, y1, x2, y2, x3, y3);
    }
    /*else if(code == 0x25a0) { // ■  0x25fc and 0x25fe are also black square, but they're not used in big5.
        ctx.fillRect(x, y, w, h);
    }*/
    else
        return false;
    return true;
}

// draw unicode character with clipping
function drawClippedChar(ctx, unichar, style, x, y, maxw, clipx, clipy, clipw, cliph){
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipx, clipy, clipw, cliph);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle=style;
    // if this character is a CJK ideographic character (填色方塊)
    if(!tryDrawIdeograph(ctx, unichar, x, y, maxw, cliph)) { // FIXME: use cliph instead of expected height is not very good.
        if(typeof(chrome) !== 'undefined') // GC only
            ctx.fillText(unichar, x, y + cliph/2, maxw);
        else
            ctx.fillText(unichar, x, y, maxw);
    }
    ctx.restore();
}

const termColors=[
    // dark
    '#000000', // black
    '#800000', // red
    '#008000', // green
    '#808000',   // yellow
    '#000080', // blue
    '#800080', // magenta
    '#008080', // cyan
    '#c0c0c0', // light gray
    // bright
    '#808080',   // gray
    '#ff0000', // red
    '#00ff00', // green
    '#ffff00',   // yellow
    '#0000ff', // blue
    '#ff00ff', // magenta
    '#00ffff', // cyan
    '#ffffff' // white
];

// Terminal View

var uriColor='#FF6600'; // color used to draw URI underline
var selectedStyle = 'rgba(49, 106, 197, 0.6)';

function setTimer(repeat, func, timelimit) {
    if(repeat) {
        return {
            timer: setInterval(func, timelimit),
            cancel: function() {
                clearInterval(this.timer);
            }
        };
    } else {
        return {
            timer: setTimeout(func, timelimit),
            cancel: function() {
                clearTimeout(this.timer);
            }
        };
    }
}

function TermView(canvas, input, decoder, opener) {
    this.canvas = canvas;
    this.decoder = decoder;
    this.opener = opener;
    this.ctx = canvas.getContext("2d");
    this.buf=null;

    // text selection
    this.selection = new TermSel(this);

    // Cursor
    this.cursorX=0;
    this.cursorY=0;
    this.cursorVisible=true; // false to hide the cursor
    this.cursorShow=false; // blinking state of cursor

    // Process the input events
    this.input = input;
    this.inputHandler = new InputHandler(this);

    // initialize
    var ctx = this.ctx;
    ctx.fillStyle = "#c0c0c0";
    this.onResize();

    var _this=this;
    this.blinkTimeout=setTimer(true, function(){_this.onBlink();}, 600);
}

TermView.prototype={

    setBuf: function(buf) {
        this.buf=buf;
    },

    setConn: function(conn) {
        this.conn=conn;
    },

    /* update the canvas to reflect the change in TermBuf */
    update: function() {
        var buf = this.buf;
        if(buf.changed) // content of TermBuf changed
        {
            buf.updateCharAttr(); // prepare TermBuf
            this.redraw(false); // do the redraw
            buf.changed=false;
        }
        if(buf.posChanged) { // cursor pos changed
            this.updateCursorPos();
            buf.posChanged=false;
        }
    },

    drawSelRect: function(ctx, x, y, w, h) {
        var tmp = ctx.fillStyle;
        ctx.fillStyle = selectedStyle;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = tmp;
    },

    drawChar: function(row, col, x, y) {
        var line = this.buf.lines[row];
        if(line){
            var ch = line[col];
            this.doDrawChar(line, ch, row, col, x, y);
        }
    },

    doDrawChar: function(line, ch, row, col, x, y) {
        var chw = this.chw;
        var chh = this.chh;
        if(!ch.isLeadByte) {
            // if this is second byte of DBCS char, draw the first byte together.
            if(col >=1 && line[col-1].isLeadByte) {
                --col;
                x -= chw;
                ch = line[col];
            }
        }
        var fg = ch.getFg();
        var bg = ch.getBg();
        var ctx = this.ctx;
        ctx.save();

        if(ch.isLeadByte) { // first byte of DBCS char
            var cols = this.buf.cols;
            ++col;
            if(col < cols) {
                var ch2 = line[col]; // second byte of DBCS char
                // draw background color
                ctx.fillStyle=termColors[bg];
                var bg2 = ch2.getBg();
                if(bg == bg2) { // two bytes has the same bg
                    ctx.fillRect(x, y, chw * 2, chh);
                }
                else { // two bytes has different bg
                    ctx.fillRect(x, y, chw, chh); // lead byte
                    ctx.fillStyle=termColors[bg2];
                    ctx.fillRect(x + chw, y, chw, chh); // second byte
                }
                // draw text
                var chw2 = chw * 2;
                // blinking text needs to be hidden sometimes
                var visible1 = (!ch.blink || this.blinkShow); // ch1 is visible
                var visible2 = (!ch2.blink || this.blinkShow); // ch2 is visible
                // don't draw hidden text
                if(visible1 || visible2) { // at least one of the two bytes should be visible
                    var b5 = ch.ch + ch2.ch; // convert char to UTF-8 before drawing
                    //var charset = this.conn.listener.prefs.Encoding;
                    //var u = this.conv.convertStringToUTF8(b5, charset,  true); // UTF-8
                    //var u = iconv.decode(b5, 'big5');
                    var u = this.decoder(b5);

                    if(u) { // ch can be converted to valid UTF-8
                        var fg2 = ch2.getFg(); // fg of second byte
                        if( fg == fg2 ) { // two bytes have the same fg
                            if(visible1) { // first half is visible
                                if(visible2) // two bytes are all visible
                                    drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw2, chh);
                                else // only the first half is visible
                                    drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw, chh);
                            }
                            else if(visible2) { // only the second half is visible
                                drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x + chw, y, chw, chh);
                            }
                        }
                        else {
                            // draw first half
                            if(visible1)
                                drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw, chh);
                            // draw second half
                            if(visible2)
                                drawClippedChar(ctx, u, termColors[fg2], x, y, chw2, x + chw, y, chw, chh);
                        }
                    }
                }
                // TODO: draw underline

                // draw selected color
                if(ch.isSelected)
                    this.drawSelRect(ctx, x, y, chw2, chh);

                line[col].needUpdate=false;
            }
        }
        else {
            ctx.fillStyle=termColors[bg];
            ctx.fillRect(x, y, chw, chh);
            // only draw visible chars to speed up
            if(ch.ch > ' ' && (!ch.blink || this.blinkShow))
                drawClippedChar(ctx, ch.ch, termColors[fg], x, y, chw, x, y, chw, chh);

            // TODO: draw underline

            // draw selected color
            if(ch.isSelected)
                this.drawSelRect(ctx, x, y, chw, chh);
        }
        ctx.restore();
        ch.needUpdate=false;
    },

    redraw: function(force) {
        var cursorShow=this.cursorShow;
        if(cursorShow)
            this.hideCursor();

        var cols=this.buf.cols;
        var rows=this.buf.rows;
        var ctx = this.ctx;

        var lines = this.buf.lines;

        for(var row=0; row<rows; ++row) {
            var chh = this.chh;
            var y=row * chh;
            var x = 0;
            var line = lines[row];
            var lineUpdated = false;
            var chw = this.chw;
            for(var col=0; col<cols;) {
                var ch = line[col];
                if(force || ch.needUpdate) {
                    this.doDrawChar(line, ch, row, col, x, y);
                    lineUpdated = true;
                }

                if(ch.isLeadByte) {
                    col += 2;
                    x += chw * 2;
                }
                else {
                    ++col;
                    x += chw;
                }
            }

            // draw underline for links
            if(lineUpdated){
              var uris = line.uris;
              if(uris){
                for (var i=0 ; i<uris.length ; i++) {
                  ctx.save();
                  ctx.strokeStyle = uriColor;
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.lineTo( uris[i][0] * chw, y + chh - 1 );
                  ctx.lineTo( uris[i][1] * chw, y + chh - 1 );
                  ctx.stroke();
                  ctx.restore();
                }
              }
              lineUpdated = false;
            }
        }
        if(cursorShow)
            this.showCursor();
    },

    onTextInput: function(text) {
        //var charset = this.conn.listener.prefs.Encoding;
        var charset = null;
        if (text.charCodeAt(0) == 10) return; // strip \n, workaround to not send \r\n
        this.conn.convSend(text, charset);
    },

    onkeyPress: function(e) {
        // dump('onKeyPress:'+e.charCode + ', '+e.keyCode+'\n');
        var conn = this.conn;

        // give keypress control back to Firefox
        /*if ( !conn.app.ws )
          return;*/

        // Don't handle Shift Ctrl Alt keys for speed
        if(e.keyCode > 15 && e.keyCode < 19) return;

        if(e.charCode) { // FX only
            // Control characters
            if(e.ctrlKey && !e.altKey && !e.shiftKey) {
                // Ctrl + @, NUL, is not handled here
                if( e.charCode >= 65 && e.charCode <=90 ) { // A-Z
		    e.charCode = 67;
                    if(this.selection.hasSelection())
                        conn.listener.copy(); // ctrl+c
                    else
                        conn.send( String.fromCharCode(e.charCode - 64) );
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                else if( e.charCode >= 97 && e.charCode <=122 ) { // a-z
		    e.charCode = 67;
                    if(this.selection.hasSelection())
                        conn.listener.copy(); // ctrl+c
                    else
                        conn.send( String.fromCharCode(e.charCode - 96) );
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            } if(e.ctrlKey && !e.altKey && e.shiftKey) {
                switch(e.charCode) {
                case 65: // ctrl+shift+a
                case 97: // ctrl+shift+A
                    conn.listener.selAll();
                    break;
                case 83: // ctrl+shift+s
                case 115: // ctrl+shift+S
                    conn.listener.search();
                    break;
                case 86: // ctrl+shift+v
                case 118: // ctrl+shift+V
                    conn.listener.paste();
                    break;
                default:
                    return; // don't stopPropagation
                }
                e.preventDefault();
                e.stopPropagation();
            }
        } else if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
            switch(e.keyCode){
            case 8:
                conn.send('\b');
                break;
            case 9:
                conn.send('\t');
                // don't move input focus to next control
                e.preventDefault();
                e.stopPropagation();
                break;
            case 13:
                conn.send('\r');
                break;
            case 27: //ESC
                conn.send('\x1b');
                break;
            case 33: //Page Up
                conn.send('\x1b[5~');
                break;
            case 34: //Page Down
                conn.send('\x1b[6~');
                break;
            case 35: //End
                conn.send('\x1b[4~');
                break;
            case 36: //Home
                conn.send('\x1b[1~');
                break;
            case 37: //Arrow Left
                conn.send('\x1b[D');
                break;
            case 38: //Arrow Up
                conn.send('\x1b[A');
                break;
            case 39: //Arrow Right
                conn.send('\x1b[C');
                break;
            case 40: //Arrow Down
                conn.send('\x1b[B');
                break;
            case 45: //Insert
                conn.send('\x1b[2~');
                break;
            case 46: //DEL
                conn.send('\x1b[3~');
                break;
            }
        } else if(e.ctrlKey && !e.altKey && !e.shiftKey) { // for GC
            if(e.keyCode >= 65 && e.keyCode <= 90) { // A-Z key
                if(e.keyCode == 67 && this.selection.hasSelection()) {
                    conn.listener.copy(); // ctrl+c
                } else {
                    conn.send( String.fromCharCode(e.keyCode - 64) );
                }
            } else if(e.keyCode >= 219 && e.keyCode <= 221) { // [ \ ]
                conn.send( String.fromCharCode(e.keyCode - 192) );
            }
            e.preventDefault();
            e.stopPropagation();
        } else if(e.ctrlKey && !e.altKey && e.shiftKey) { // for GC
            switch(e.keyCode) {
            case 50: // @
                conn.send( String.fromCharCode(0) );
                break;
            case 54: // ^
                conn.send( String.fromCharCode(30) );
                break;
            case 109: // _
                conn.send( String.fromCharCode(31) );
                break;
            case 191: // ?
                conn.send( String.fromCharCode(127) );
                break;
            case 65: // ctrl+shift+a
                conn.listener.selAll();
                break;
            case 83: // ctrl+shift+s
                conn.listener.search();
                break;
            case 86: // ctrl+shift+v
                conn.listener.paste();
                break;
            default:
                return; // don't stopPropagation
            }
            e.preventDefault();
            e.stopPropagation();
        }
    },

    onResize: function() {
        var cols = this.buf ? this.buf.cols : 80;
        var rows = this.buf ? this.buf.rows : 24;
        var win = document.body;
        this.canvas.height = win.clientHeight;
        var fontFamily = 'monospace';
        /*if(isBrowser(['IE']))
            fontFamily = 'mingliu';*/
        var ctx = this.ctx;
        this.chh = Math.floor(this.canvas.height / rows);
        var font = this.chh + 'px ' + fontFamily;
        ctx.font= font;
        var textBaseline = 'top';
        if(typeof(chrome) !== 'undefined') // GC only
            textBaseline = 'middle';
        ctx.textBaseline = textBaseline;

        var m=ctx.measureText('　'); //全形空白
        this.chw=Math.round(m.width/2);

        // if overflow, resize canvas again
        var overflowX = (this.chw * cols) - win.clientWidth;
        if(overflowX > 0) {
          this.canvas.width = win.clientWidth;
          this.chw = Math.floor(this.canvas.width / cols);
          this.chh = this.chw*2;  // is it necessary to measureText?
          font = this.chh + 'px ' + fontFamily;
          ctx.font= font;
          this.canvas.height = this.chh * rows;
        }

        if(this.buf) {
            this.canvas.width = this.chw * cols;
            // font needs to be reset after resizing canvas
            ctx.font= font;
            ctx.textBaseline = textBaseline;
            this.redraw(true);
        }
        else {
            // dump(this.chw + ', ' + this.chw * 80 + '\n');
            this.canvas.width = this.chw * cols;
            // font needs to be reset after resizing canvas
            ctx.font= font;
            ctx.textBaseline = textBaseline;
        }

        var visible=this.cursorVisible;
        if(visible)
            this.hideCursor();

        this.updateCursorPos();
        // should we set cursor height according to chh?
        this.setCursorSize(this.chw, 2);

        if(visible)
            this.showCursor();
    },

    // Cursor
    setCursorSize: function(w, h){
        var visible=this.cursorVisible;
        if(visible)
            this.hideCursor();
        this.cursorW=w;
        this.cursorH=h;
        if(visible)
            this.showCursor();
    },

    updateCursorPos: function(){
        var visible=this.cursorVisible;
        if(visible)
            this.hideCursor();
        if(this.buf) {
            this.cursorX=this.buf.curX * this.chw;
            this.cursorY=(this.buf.curY + 1)*this.chh - this.cursorH;
        }
        else {
            this.cursorX=0;
            this.cursorY=this.chh - this.cursorH;
        }
        if(visible)
            this.showCursor();
    },

    onCompositionStart: function(e) {
        var top = (this.buf.curY + 1) * this.chh;
        this.input.style.top = (this.canvas.offsetTop + ( top + this.input.clientHeight > this.canvas.clientHeight ? top - this.input.clientHeight : top )) + 'px';
        this.input.style.left = (this.canvas.offsetLeft + this.buf.curX * this.chw ) + 'px';
    },

    onCompositionEnd: function(e) {
      this.input.style.top = '-100px';
    },

    onBlink: function(){
        this.blinkShow=!this.blinkShow;
        var buf = this.buf;

        // redraw the canvas first if needed
        if(buf.changed)
            this.update();

        var col, cols=buf.cols;
        var row, rows=buf.rows;
        var lines = buf.lines;

        // FIXME: draw blinking characters
        for(row = 0; row < rows; ++row) {
            var line = lines[row];
            for(col = 0; col < cols; ++col) {
                var ch = line[col];
                if(ch.blink)
                    ch.needUpdate = true;
                // two bytes of DBCS chars need to be updated together
                if(ch.isLeadByte) {
                    ++col;
                    if(ch.blink)
                        line[col].needUpdate = true;
                    // only second byte is blinking
                    else if(line[col].blink) {
                        ch.needUpdate = true;
                        line[col].needUpdate = true;
                    }
                }
            }
        }
        this.redraw(false);

        if(this.cursorVisible){
            this.cursorShow=!this.cursorShow;
            this.drawCursor();
        }
    },

    showCursor: function(){
        this.cursorVisible=true;
        if( !this.cursorShow ){
            this.cursorShow=true;
            this.drawCursor();
        }
    },

    hideCursor: function(){
        if(this.cursorShow){ // the cursor is currently shown
            this.cursorShow=false;
            this.drawCursor();
        }
        this.cursorVisible=false;
    },

    drawCursor: function(){
        if(this.chh === 0 || this.chw === 0)
            return;

        var ctx=this.ctx;
        var row = Math.floor(this.cursorY / this.chh);
        var col = Math.floor(this.cursorX / this.chw);

        // Some BBS allow the cursor outside the screen range
        if(this.buf && this.buf.cols == col)
            return;

        if(this.cursorShow) {
            if(this.buf) {
                let line = this.buf.lines[row];
                if(!line)
                    return;
                let ch=line[col];
                let fg=ch.getFg();
                ctx.save();
                ctx.fillStyle=termColors[fg];
                ctx.fillRect(this.cursorX, this.cursorY, this.cursorW, this.cursorH);
                ctx.restore();
            }
            else {

            }
        }
        else {
            if(this.buf) {
                let line = this.buf.lines[row];
                if(!line)
                    return;
                let ch = line[col];
                if(!ch.needUpdate)
                    this.doDrawChar(line, ch, row, col, this.cursorX, row * this.chh);
                    if(line.uris) { // has URI in this line
                        let n=line.uris.length;
			let i = 0;
                        for(; i < n; ++i) {
                            let uri = line.uris[i];
                            if(uri[0] <= col && uri[1] > col) { // the char is part of a URI
                                // draw underline for URI.
                                ctx.strokeStyle = uriColor;
                                ctx.lineWidth = 2;
                                ctx.beginPath();
                                var y = (row + 1) * this.chh - 1;
                                var x = col * this.chw;
                                ctx.lineTo(x, y);
                                ctx.lineTo(x + this.chw, y);
                                ctx.stroke();
                            }
                        }
                    }
            }
            else {

            }
        }
    },

    // convert mouse pointer position (x, y) to (col, row)
    mouseToColRow: function(cX, cY){
        var x = cX - this.canvas.offsetLeft;
        var y = cY - this.canvas.offsetTop;
        var col = Math.floor(x / this.chw);
        var row = Math.floor(y / this.chh);

        if(col < 0)
            col = 0;
        else if(col > this.buf.cols)
            col = this.buf.cols;

        if(row < 0)
            row = 0;
        else if(row >= this.buf.rows)
            row = this.buf.rows - 1;

        // FIXME: we shouldn't select half of a DBCS character
        return {col: col, row: row};
    },

    checkURI: function(cursor, fullURI) {
        var col = cursor.col, row = cursor.row;
        var uris = this.buf.lines[row].uris;

        var length = uris ? uris.length : 0;
        for (var i=0;i<length;i++) {
            if (col >= uris[i][0] && col < uris[i][1]) { //@ < or <<
                if(!fullURI)
                    return true;
                var uri = "";
                for (var j=uris[i][0];j<uris[i][1];j++)
                    uri = uri + this.buf.lines[row][j].ch;
                return uri;
            }
        }
        return false;
    },

    onMouseDown: function(event) {
        //if(this.conn.listener.menu.onclick(event.pageX, event.pageY))
        //    return; // let context menu handle it

        if(event.button === 0) { // left button
            var cursor = this.mouseToColRow(event.pageX, event.pageY);
            if(!cursor) return;
            // FIXME: only handle left button
            this.selection.selStart(event.shiftKey, cursor.col, cursor.row);
        }
    },

    onMouseMove: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if(!cursor) return;

        // handle text selection
        if(this.selection.isSelecting)
            this.selection.selUpdate(cursor.col, cursor.row);

        // handle cursors for hyperlinks
        var col = cursor.col, row = cursor.row;
        var uris = this.buf.lines[row].uris;

        var length = uris ? uris.length : 0;
        if(this.checkURI(cursor)) {
            this.canvas.style.cursor = "pointer";
            return;
        }
        this.canvas.style.cursor = "default";
    },

    onMouseUp: function(event) {
        //if(this.conn.listener.menu.onclick(event.pageX, event.pageY))
        //    return; // let context menu handle it

        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if(!cursor) return;

        if(event.button === 0) { // left button
            if(this.selection.isSelecting)
                this.selection.selEnd(cursor.col, cursor.row);
        } else if(event.button == 1) { // middle button
            if(this.checkURI(cursor))
                {} // don't trigger MouseBrowsing or Paste
            else
                this.conn.listener.paste(true); // selection clipboard
        }
    },

    onClick: function(event) {
        //if(this.conn.listener.menu.onclick(event.pageX, event.pageY))
        //    return; // let context menu handle it

        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if(!cursor) return;

        // Event dispatching order: mousedown -> mouseup -> click
        // For a common click, previous selection always collapses in mouseup

        var uri = this.checkURI(cursor, true);
        if(uri) {
            if(event.button === 0) // left button
                this.opener(uri);
            else if(event.button == 1) // middle button
                this.opener(uri);
            else if(event.button == 2) // right button
                {} //FIXME: add "Save As", "Copy Link" and so on to context menu
            return;
        }
    },

    onDblClick: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if(!cursor) return;
        this.selection.selectWordAt(cursor.col, cursor.row);
    },

    updateSel: function(updateCharAttr) {
        if(!updateCharAttr && this.buf.changed) // we're in the middle of screen update
            return;

        var col, row;
        var cols = this.buf.cols;
        var rows = this.buf.rows;
        var lines = this.buf.lines;

        for(row = 0; row < rows; ++row) {
            for(col = 0; col < cols; ++col) {
                var ch = lines[row][col];
                var is_sel = this.selection.isCharSelected(col, row);
                if(is_sel != ch.isSelected) {
                    ch.isSelected = is_sel;
                    ch.needUpdate = true;
                }
            }
        }

        if(!updateCharAttr)
            this.redraw(false);
    },

    removeEventListener: function() {
        this.inputHandler.unload();
    }
};

module.exports = TermView;
