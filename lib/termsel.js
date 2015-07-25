// Manage selected text of TermView

function strStrip (s) {
  var l = s.length
  var i = l - 1
  while(i >= 0 && s.charAt(i) == ' ')
  --i
  if(i >= -1 && i < l)
    return s.substr(0, i + 1)
  return s
}

function TermSel (view) {
  this.view = view
  this.isSelecting = false
  this.blockMode = false

  this.realStartCol = -1
  this.realStartRow = -1
  this.realEndCol = -1
  this.realEndRow = -1

  this.startCol = -1
  this.startRow = -1
  this.endCol = -1
  this.endRow = -1
}

TermSel.prototype = {
  selStart: function (block_mode, col, row) {
    if(this.startRow != -1) // has old selection
      this.cancelSel(false)
    this.isSelecting = true
    this.blockMode = block_mode

    this.realStartCol = this.startCol = this.realEndCol = this.endCol = col
    this.realStartRow = this.startRow = this.realEndRow = this.endRow = row
  },

  selUpdate: function (col, row) {
    this.realEndCol = col
    this.realEndRow = row
    var col1, col2, row1, row2, col, row

    // swap start and end points to kept them in correct order
    if(this.realEndRow == this.realStartRow) { // only one line is selected
      row1 = row2 = this.realStartRow
      if(this.realStartCol < this.realEndCol) {
        col1 = this.realStartCol
        col2 = this.realEndCol
      } else {
        col1 = this.realEndCol
        col2 = this.realStartCol
      }
    }
    else if(this.realEndRow < this.realStartRow) {
      col1 = this.realEndCol
      row1 = this.realEndRow
      col2 = this.realStartCol
      row2 = this.realStartRow
    } else {
      col1 = this.realStartCol
      row1 = this.realStartRow
      col2 = this.realEndCol
      row2 = this.realEndRow
    }

    this.startCol = col1
    this.startRow = row1
    this.endCol = col2
    this.endRow = row2

    if(this.blockMode) {
      if(this.startCol > this.endCol) { // swap
        this.startCol = col2
        this.endCol = col1
      }
    }

    // ask the term view to redraw selected text
    this.view.updateSel()
  },

  selEnd: function (col, row, refresh) {
    this.selUpdate(col, row)
    if(refresh) {
      // updateSel() is called but won't work (buf.changed==true)
      this.view.updateSel(true); // only update Char Attr
    }

    this.isSelecting = false
    if ( this.startCol == this.endCol && this.startRow == this.endRow) {
      this.cancelSel(true)
      return
    }

    if(this.blockMode) {
      if(this.startCol == this.endCol) {
        this.cancelSel(true)
        return
      }
    }

    this.selTrim()

    this.view.conn.listener.copy(true); // selection clipboard
  },

  selTrim: function () {
    var buf = this.view.buf

    if(this.blockMode) {
      for (var row = this.startRow; row <= this.endRow; ++row) {
        var line = buf.lines[row]
        var startCol = this.startCol
        if(startCol > 0) {
          if(line[startCol - 1].isLeadByte) {
            line[startCol].isSelected = false
            startCol++
          }
        }
        var endCol = this.endCol
        if(endCol > 0) {
          if(line[endCol - 1].isLeadByte) {
            line[endCol].isSelected = true
            endCol++
          }
        }
        if(startCol < endCol) // has visible selection region
          var hasSelection = true
      }
      if(!hasSelection)
        this.cancelSel(true)
      return
    }

    // ensure we don't select half of a DBCS character
    var col = this.startCol
    var line = buf.lines[this.startRow]
    if(col < buf.cols && col > 0) {
      if(!line[col].isLeadByte && line[col - 1].isLeadByte) {
        line[col].isSelected = false
        this.startCol++
      }
    }

    if ( this.startCol == this.endCol && this.startRow == this.endRow) {
      this.cancelSel(true)
      return
    }

    // fit the real selection on the screen
    if(this.endCol == buf.cols) this.endCol--
    var col = this.endCol
    var line = buf.lines[this.endRow]
    if(!line[col].isSelected) {
      if (!line[col].isLeadByte && line[col - 1].isLeadByte)
        line[col].isSelected = true
      else
        this.endCol--
    }
  },

  // Updating selection range just after termbuf changes
  refreshSel: function () {
    this.cancelSel(false)
    this.view.updateSel(true); // only update Char Attr
  },

  cancelSel: function (redraw) {
    this.realStartCol = this.startCol = this.realEndCol = this.endCol = -1
    this.realStartRow = this.startRow = this.realEndRow = this.endRow = -1
    this.isSelecting = false
    if(redraw)
      this.view.updateSel()
  },

  isCharSelected: function (col, row) {
    if(this.startRow == -1) // no selection at all
      return false

    var cols = this.view.buf.cols
    if(this.startRow == this.endRow) { // if only one line is selected
      if(this.startCol == this.endCol)
        return false
      return row == this.startRow && col >= this.startCol && col < this.endCol
    }

    if(this.blockMode) {
      return this.startRow <= row && row <= this.endRow &&
        this.startCol <= col && col < this.endCol
    }

    // if multiple lines are selected
    if(row == this.startRow)
      return col >= this.startCol && col < cols
    else if(row == this.endRow)
      return col >= 0 && col < this.endCol
    else if(row > this.startRow && row < this.endRow)
      return true
    return false
  },

  selectWordAt: function (col, row) {
    var buf = this.view.buf
    var line = buf.lines[row]
    var splitter = null
    var chByte = 1

    if(line[col].isLeadByte || (col > 0 && line[col - 1].isLeadByte)) { // DBCS, we should select DBCS text
      if(!line[col].isLeadByte)
        col--;  // adjust cursor col, make selection start from leadByte of DBCS
      splitter = /[\x00-\x7E]/
      chByte = 2
    } else {
      if( line[col].ch == ' ')
        return null
      else if( line[col].ch.match(/\w/))  // should select [A-Za-z0-9_]
        splitter = /\s|\W|\b/
      else // punctuation marks, select nearby punctuations
        splitter = /\s|\w|[^\x00-\x7F]/
    }

    // FIXME: need an implementation of better performance.
    var textL = buf.getRowText(row, 0, col).split(splitter).pop()
    var textR = buf.getRowText(row, col).split(splitter).shift()

    var colStart = col - textL.length * chByte
    var colEnd = col + textR.length * chByte
    this.selStart(false, colStart, row)
    this.selEnd(colEnd, row)
  },

  selectAll: function () {
    var buf = this.view.buf
    this.selStart(false, 0, 0)
    this.selEnd(buf.cols, buf.rows - 1)
  },

  hasSelection: function () {
    return this.startRow != -1
  },

  getText: function () {
    if(!this.hasSelection())
      return null

    if(this.blockMode)
      return this.getBlockText()

    var buf = this.view.buf
    var lines = buf.lines
    var row, col
    var endCol = (this.endCol < buf.cols) ? this.endCol : (buf.cols - 1)
    var ret = ''
    var tmp = ''
    if(this.startRow == this.endRow) { // only one line is selected
      var line = lines[this.startRow]
      tmp = ''
      for (col = this.startCol; col <= endCol; ++col)
        tmp += line[col].ch
      ret += strStrip(tmp)
    } else {
      var cols = buf.cols
      var line = lines[this.startRow]
      for (col = this.startCol; col < cols; ++col)
        tmp += line[col].ch
      ret += strStrip(tmp)
      ret += '\n'
      for (row = this.startRow + 1; row < this.endRow; ++row) {
        line = lines[row]
        tmp = ''
        for (col = 0; col < cols; ++col)
          tmp += line[col].ch
        ret += strStrip(tmp)
        ret += '\n'
      }
      line = lines[this.endRow]
      tmp = ''
      for (col = 0; col <= endCol; ++col)
        tmp += line[col].ch
      ret += strStrip(tmp)
    }
    var charset = this.view.conn.listener.prefs.Encoding
    ret = this.view.conv.convertStringToUTF8(ret, charset, true)
    return ret
  },

  getBlockText: function () {
    if(this.startCol == this.endCol)
      return null
    var buf = this.view.buf
    var lines = buf.lines
    var row, col
    var startCol = this.startCol
    var endCol = this.endCol
    var ret = ''
    var tmp = ''
    for (row = this.startRow; row <= this.endRow; ++row) {
      var line = lines[row]
      tmp = ''
      for (col = startCol; col < endCol; ++col)
        tmp += line[col].ch
      // Detect DBCS
      if(startCol > 0 && line[startCol - 1].isLeadByte)
        tmp = tmp.replace(/^./, ' '); // keep the position of selection
      if(line[endCol - 1].isLeadByte)
        tmp += line[endCol].ch
      ret += strStrip(tmp)
      ret += (row < this.endRow ? '\n' : '')
    }
    var charset = this.view.conn.listener.prefs.Encoding
    return this.view.conv.convertStringToUTF8(ret, charset, true)
  }
}

module.exports = TermSel
