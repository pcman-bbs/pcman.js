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
	constructor({termbuf, logger}) {
		if (termbuf === undefined) {
			throw new Error('termbuf shall be defined.');
		}

		this._termbuf = termbuf;
		this._logger = logger || bunyan.createLogger({name: 'blackhole', stream: streamBlackhole()});

		this._mode = MODE_NORMAL;

		this._csiParams = [];
		this._text = [];
	}

	_emitText() {
		if (this._text !== []) {
			this._termbuf.puts(this._text);
			this._text = [];
		}
	}

	_handleChInNormal(ch) {
		if (ch !== ESCAPE) {
			this._text.append(ch);
		}
	}

	_handleChInEscape(ch) {
	}

	_handleChInCSI(ch) {
	}

	_handleCh(ch) {
		switch (this._mode) {
			case MODE_NORMAL: return this._handleChInNormal(ch);
			case MODE_ESCAPE: return this._handleChInEscape(ch);
			case MODE_CSI: return this._handleChInCSI(ch);
		}
		this._logger.error(`Unknown mode ${this._mode}`);
	}

	parse(buffer) {
		this._logger.trace({buffer}, 'parse');

		Uint8Array(buffer).forEach(this._handleCh);
		_emitText();
	}
}
