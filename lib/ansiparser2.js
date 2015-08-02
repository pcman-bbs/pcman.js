/*
 * Copyright 2015 ChangZhuo Chen (陳昌倬)
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import bunyan from 'bunyan';
import streamBlackhole from 'stream-blackhole';

import {
	ATTR_RESET,
	ATTR_BRIGHT,
	ATTR_DIM,
	ATTR_UNDERSCORE,
	ATTR_BLINK,
	ATTR_REVERSE,
	ATTR_HIDDEN,

	COLOR_MIM,
	COLOR_BLACK,
	COLOR_RED,
	COLOR_GREEN,
	COLOR_YELLOW,
	COLOR_BLUE,
	COLOR_MAGENTA,
	COLOR_CYAN,
	COLOR_WHITE,
	COLOR_MAX,

	COLOR_FOREGROUND,
	COLOR_BACKGROUND,
} from './const';

const MODE_NORMAL = 'MODE_NORMAL';
const MODE_ESCAPE = 'MODE_ESCAPE';
const MODE_CSI    = 'MODE_CSI'; // Control Sequence Introducer or Control Sequence Initiator

const ESCAPE = 0x1b;

export default class {
	constructor(termbuf, opts) {
		if (termbuf === undefined) {
			throw new Error('termbuf shall be defined.');
		}

		opts = opts || {};

		this._termbuf = termbuf;
		this._logger = opts.logger || bunyan.createLogger({name: 'blackhole', stream: streamBlackhole()});

		this._mode = MODE_NORMAL;

		this._modeHandler = {
			MODE_NORMAL: this._handleChInNormal,
			MODE_ESCAPE: this._handleChInEscape,
			MODE_CSI: this._handleChInCSI,
		};

		this._escapeHandler = {
			'[': () => {
				this._changeMode(MODE_CSI);
			},

			'D': () => {
				this._termbuf.scrollUp(1);
			},
		};

		this._csiParams = [];
		this._text = [];
	}

	_changeMode(mode) {
		this._logger.trace(`Change mode from ${this._mode} to ${mode}`);

		if (this._mode === MODE_NORMAL && mode !== MODE_NORMAL) {
			this._emitText();
		}

		this._mode = mode;
	}

	_convertArray2ArrayBuffer(array) {
		let buffer = new ArrayBuffer(array.length);

		for (let i = 0; i < array.length; ++i) {
			buffer[i] = array[i];
		}

		return buffer;
	}

	_emitText() {
		if (this._text !== []) {
			this._termbuf.puts(this._convertArray2ArrayBuffer(this._text));
			this._text = [];
		}
	}

	_handleChInNormal(ch) {
		this._logger.trace({ch}, '_handleChInNormal');
		if (ch === ESCAPE) {
			this._changeMode(MODE_ESCAPE);
		} else {
			this._text = this._text.concat(ch);
		}
	}

	_handleChInEscape(ch) {
		this._logger.trace({ch}, '_handleChInEscape');

		ch = String.fromCharCode(ch);

		if (this._escapeHandler[ch] !== undefined) {
			return this._escapeHandler[ch].call(this);
		}

		this._logger.warn(`Unknown character sequence <ESC>${ch}`);
		this._changeMode(MODE_NORMAL);
	}

	_handleChInCSI(ch) {
	}

	_handleCh(ch) {
		this._logger.trace({ch}, '_handleCh');

		if (this._modeHandler[this._mode]) {
			return this._modeHandler[this._mode].call(this, ch);
		}

		this._logger.error(`Unknown mode ${this._mode}`);
	}

	parse(buffer) {
		this._logger.trace({buffer}, 'parse');

		for (let i = 0; i < buffer.byteLength; ++i) {
			this._handleCh(buffer[i]);
		}

		this._emitText();
	}
}
