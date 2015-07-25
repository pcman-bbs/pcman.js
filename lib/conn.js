function AppCom (conn) {
  this.conn = conn
  this.ws = null
  this.onload()
}

AppCom.prototype.onload = function () {
  if(this.ws)
    this.onunload()
}

AppCom.prototype.connect = function (host, port) {
  require('ipc').send('connect', 'ptt.cc')
  var conn = this.conn
  require('ipc').on('data', function (data) {
    var content = String.fromCharCode.apply(null, new Uint8Array(data)); // BUFFER!
    conn.onDataAvailable(content)
  })

/*if(this.ws)
    this.onunload()

//var wsUri = window.location.href.replace('http', 'ws')
var wsUri = 'ws://localhost:8080'
if(wsUri.indexOf('#') >= 0)
    wsUri = wsUri.substr(0, wsUri.indexOf('#'))
if(wsUri.indexOf('?') >= 0)
    wsUri = wsUri.substr(0, wsUri.indexOf('?'))
this.ws = new WebSocket(wsUri)
this.ws.binaryType = 'arraybuffer'

var conn = this.conn
this.ws.onopen = function(event) {
    if(conn.app.ws.readyState == 1)
        conn.app.send(host + ':' + port, 'con')
}
this.ws.onclose = function(event) {
    conn.app.ws = null
    conn.onStopRequest()
}
this.ws.onerror = function(event) {
    //dump(event.data)
    conn.app.ws = null
    conn.onStopRequest()
}
this.ws.onmessage = function(event) {
    var data = String.fromCharCode.apply(null, new Uint8Array(event.data))
    var action = data.substr(0, 3)
    var content = data.substr(3)
    switch(action) {
    case "con":
        conn.onStartRequest()
        break
    case "dat":
        conn.onDataAvailable(content)
        break
    case "dis":
        conn.onStopRequest()
        break
    case "cop":
        conn.app.copyCallback()
        break
    case "pas":
        conn.app.pasteCallback(decodeURIComponent(escape(content)))
        break
    default:
    }
};*/
}

AppCom.prototype.send = function (output, action) {
  /*if(!this.ws)
      return
  if(this.ws.readyState != 1)
      return;*/
  if(!action)
    action = 'dat'
    /*this.ws.send((new Uint8Array(Array.prototype.map.call(
        action + output, function(x) { return x.charCodeAt(0); }
    ))).buffer);*/

  require('ipc').send('send', output)
}

AppCom.prototype.onunload = function () {
  /*if(!this.ws)
      return;*/
  this.send('', 'dis')
/*this.ws.close()
this.ws = null;*/
}

AppCom.prototype.copy = function (text, callback) {
  if(!this.ws)
    return
  this.send(unescape(encodeURIComponent(text)), 'cop')
  this.copyCallback = callback
}

AppCom.prototype.paste = function (callback) {
  if(!this.ws)
    return
  this.send('', 'pas')
  this.pasteCallback = callback
}

// Handle Telnet Connections according to RFC 854

// Telnet commands
const SE = '\xf0'
const NOP = '\xf1'
const DATA_MARK = '\xf2'
const BREAK = '\xf3'
const INTERRUPT_PROCESS = '\xf4'
const ABORT_OUTPUT = '\xf5'
const ARE_YOU_THERE = '\xf6'
const ERASE_CHARACTER = '\xf7'
const ERASE_LINE = '\xf8'
const GO_AHEAD = '\xf9'
const SB = '\xfa'

// Option commands
const WILL = '\xfb'
const WONT = '\xfc'
const DO = '\xfd'
const DONT = '\xfe'
const IAC = '\xff'

// Telnet options
const ECHO = '\x01'
const SUPRESS_GO_AHEAD = '\x03'
const TERM_TYPE = '\x18'
const IS = '\x00'
const SEND = '\x01'
const NAWS = '\x1f'

// state
const STATE_DATA = 0
const STATE_IAC = 1
const STATE_WILL = 2
const STATE_WONT = 3
const STATE_DO = 4
const STATE_DONT = 5
const STATE_SB = 6

function Conn (listener, sender, encoder) {
  this.sender = sender
  this.encoder = encoder
  this.host = null
  this.port = 23

  this.connectCount = 0

  this.listener = listener

  this.state = STATE_DATA
  this.iac_sb = ''

  this.app = new AppCom(this)
}

Conn.prototype = {
  connect: function (host, port) {
    if(host) {
      this.host = host
      this.port = port
    }
    this.isConnected = false

    this.app.connect(host, port)
  },

  close: function () {
    this.app.onunload()
  },

  // data listener
  onStartRequest: function () {
    if( ! this.isConnected) {
      this.isConnected = true
    }
    this.listener.onConnect(this)
  },

  onStopRequest: function () {
    this.close()
    this.listener.onClose(this)
  },

  onDataAvailable: function (content) {
    var data = ''
    var n = content.length
    for (var i = 0;i < n; ++i) {
      var ch = content[i]
      switch (this.state) {
        case STATE_DATA:
          if( ch == IAC) {
            if(data) {
              this.listener.onData(this, data)
              data = ''
            }
            this.state = STATE_IAC
          }
          else
            data += ch
          break
        case STATE_IAC:
          switch (ch) {
            case WILL:
              this.state = STATE_WILL
              break
            case WONT:
              this.state = STATE_WONT
              break
            case DO:
              this.state = STATE_DO
              break
            case DONT:
              this.state = STATE_DONT
              break
            case SB:
              this.state = STATE_SB
              break
            default:
              this.state = STATE_DATA
          }
          break
        case STATE_WILL:
          switch (ch) {
            case ECHO:
            case SUPRESS_GO_AHEAD:
              this.send(IAC + DO + ch)
              break
            default:
              this.send(IAC + DONT + ch)
          }
          this.state = STATE_DATA
          break
        case STATE_DO:
          switch (ch) {
            case TERM_TYPE:
              this.send(IAC + WILL + ch)
              break
            case NAWS:
              this.send(IAC + WILL + ch)
              // this.sendNaws(); // FIXME
              break
            default:
              this.send(IAC + WONT + ch)
          }
          this.state = STATE_DATA
          break
        case STATE_DONT:
        case STATE_WONT:
          this.state = STATE_DATA
          break
        case STATE_SB: // sub negotiation
          this.iac_sb += ch
          if( this.iac_sb.slice(-2) == IAC + SE) {
            // end of sub negotiation
            /*switch(this.iac_sb[0]) {
            case TERM_TYPE: {
                // FIXME: support other terminal types
                var rep = IAC + SB + TERM_TYPE + IS + 'VT100' + IAC + SE
                this.send( rep )
                break
                }
            }*/
            this.state = STATE_DATA
            this.iac_sb = ''
            break
          }
      }
    }
    if(data) {
      this.listener.onData(this, data)
      data = ''
    }
  },

  sendNaws: function () {
    var cols = 80
    var rows = 24
    var nawsStr = String.fromCharCode(
      Math.floor(cols / 256), cols % 256, Math.floor(rows / 256), rows % 256
    ).replace(/(\xff)/g, '\xff\xff')
    var rep = IAC + SB + NAWS + nawsStr + IAC + SE
    this.send(rep)
  },

  send: function (str) {
    // added by Hemiola SUN
    /*if(!this.app.ws)
        return;*/

    if(str) {
      // this.app.send(str)
      this.sender(str)
    }
  },

  convSend: function (unicode_str, charset) {
    // this.oconv.charset=charset
    // s = this.oconv.ConvertFromUnicode(unicode_str)
    var s = this.encoder(unicode_str).toString()
    // var s = iconv.encode(unicode_str, 'big5').toString()
    if(s)
      this.send(s)
  }
}

module.exports = Conn
