// Parser for ANSI escape sequence
// References: http://www.termsys.demon.co.uk/vtansi.htm
//             http://www.it.usyd.edu.au/~tapted/ansi.html
//             http://wapedia.mobi/en/ANSI_X3.64

const STATE_TEXT = 0
const STATE_ESC = 1
const STATE_CSI = 2

function AnsiParser (termbuf) {
  this.termbuf = termbuf
  this.state = STATE_TEXT
  this.esc = ''
}

AnsiParser.prototype = {
  feed: function (data) {
    var term = this.termbuf
    if(!term)
      return
    var s = ''
    var n = data.length
    for (var i = 0; i < n; ++i) {
      var ch = data[i]
      switch (this.state) {
        case STATE_TEXT:
          switch (ch) {
            case '\x1b':
              if(s) {
                term.puts(s)
                s = ''
              }
              this.state = STATE_ESC
              break
            default:
              s += ch
          }
          break
        case STATE_CSI:
          if( (ch >= 'a' && ch <= 'z') || (ch >= '@' && ch <= 'Z')) {
            var params = this.esc.split(';')
            for (var j = 0; j < params.length; ++j) {
              if( params[j])
                params[j] = parseInt(params[j], 10)
              else
                params[j] = 0
            }
            switch (ch) {
              // Most frequently used CSI
              case 'm':
                var attr = term.attr
                for (var n_params = params.length;n_params;--n_params) {
                  var v = params.shift()
                  switch (v) {
                    case 0: // reset
                      attr.resetAttr()
                      break
                    case 1: // bright
                      attr.bright = true
                      break
                    case 4:
                      attr.underLine = true
                      break
                    case 5: // blink
                    case 6:
                      attr.blink = true
                      break
                    case 7: // invert
                      attr.invert = true
                      break
                    case 8:
                      // invisible is not supported
                      break
                    default:
                      if(v <= 37) {
                        if(v >= 30) { // fg
                          attr.fg = v - 30
                        }
                      }else if(v >= 40) {
                        if(v <= 47) { // bg
                          attr.bg = v - 40
                        }
                      }
                      break
                  }
                }
                break
              case 'H':
              case 'f':
                if(params.length < 2)
                  term.gotoPos(0, 0); else {
                  if(params[0] > 0)
                    --params[0]
                  if(params[1] > 0)
                    --params[1]
                  term.gotoPos(params[1], params[0])
                }
                break

              case '@':
                term.insert(params[0] > 0 ? params[0] : 1)
                break
              case 'A':
                term.gotoPos(term.curX, term.curY - (params[0] ? params[0] : 1))
                break
              case 'B':
                term.gotoPos(term.curX, term.curY + (params[0] ? params[0] : 1))
                break
              case 'C':
                term.gotoPos(term.curX + (params[0] ? params[0] : 1), term.curY)
                break
              case 'D':
                term.gotoPos(term.curX - (params[0] ? params[0] : 1), term.curY)
                break
              case 'E':
                term.gotoPos(0, term.curY + (params[0] ? params[0] : 1))
                break
              case 'F':
                term.gotoPos(0, term.curY - (params[0] ? params[0] : 1))
                break
              case 'G':
                term.gotoPos(params[0] > 0 ? params[0] - 1 : 0, term.curY)
                break
              // case 'H':
              case 'I':
                term.tab(params[0] > 0 ? params[0] : 1)
                break
              case 'J':
                term.clear(params ? params[0] : 0)
                break
              case 'K':
                term.eraseLine(params ? params[0] : 0)
                break
              case 'L':
                term.insertLine(params[0] > 0 ? params[0] : 1)
                break
              case 'M':
                term.deleteLine(params[0] > 0 ? params[0] : 1)
                break
              case 'P':
                term.del(params[0] > 0 ? params[0] : 1)
                break
              case 'S':
                term.scroll(false, (params[0] > 0 ? params[0] : 1))
                break
              case 'T':
                term.scroll(true, (params[0] > 0 ? params[0] : 1))
                break
              case 'X':
                term.eraseChar(params[0] > 0 ? params[0] : 1)
                break
              case 'Z':
                term.backTab(params[0] > 0 ? params[0] : 1)
                break

              case 'd':
                term.gotoPos(term.curX, params[0] > 0? params[0] - 1: 0)
                break
              // case 'm':
              // this is the most frequently used. So it's moved to top.
              case 'r': // FIXME: scroll range
                if(!params || params.length == 0) // reset
                  term.setScrollRegion(0, term.rows - 1); else {
                  if(params.length >= 2)
                    term.setScrollRegion(params[0] - 1, params[1] - 1)
                  else
                    term.setScrollRegion(0, params[0] - 1)
                }
                break
              case 's':
                term.saveCursor()
                break
              case 'u':
                term.restoreCursor()
                break
              default:
                dump('unknown CSI: ' + ch.charCodeAt(0) + '\n')
            }
            this.state = STATE_TEXT
            this.esc = ''
          }
          else
            this.esc += ch
          break
        case STATE_ESC:
          if(ch == '[') /* CSI */
            this.state = STATE_CSI; else {
            // This is a C1 control character
            var code = ch.charCodeAt(0)
            if(code >= 0x40 && code <= 0x5f) { // @ ~ _
              switch (ch) {
                case 'D': // scroll up
                  term.scroll(false, 1)
                  break
                case 'M':// scroll down
                  term.scroll(true, 1)
                  break
                case 'E':
                  term.lineFeed()
                  term.carriageReturn()
                  break
                case '7':
                  term.saveCursor()
                  break
                case '8':
                  term.restoreCursor()
                  break
                default:
                  dump('C1 control char ESC ' + ch + 'is not handled\n')
                  break
              }
            }
            this.esc = ''
            this.state = STATE_TEXT
          }
          break
      }
    }
    if(s) {
      term.puts(s)
      s = ''
    }
  }
}

module.exports = AnsiParser
