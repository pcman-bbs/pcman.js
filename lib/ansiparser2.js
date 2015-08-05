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

const convertArray2ArrayBuffer = (array) => {
	let buffer = new ArrayBuffer(array.length);

	for (let i = 0; i < array.length; ++i) {
		buffer[i] = array[i];
	}

	return buffer;
};

const getFirstParam = (params) => {
	if (params.length >= 1 && !isNaN(params[0])) {
		return params[0];
	}
	return 1;
};

const getTwoParams = (params, def0, def1) => {
	switch (params.length) {
		default:
		case 0:
			return [def1, def0];

		case 1:
			return [def1, params[0] || def0];

		case 2:
			return [params[1] || def1, params[0] || def0];
	}
};

export default class {
	constructor(termbuf, opts) {
		if (termbuf === undefined) {
			throw new Error('termbuf shall be defined.');
		}

		opts = opts || {};

		this._termbuf = termbuf;
		this._logger = opts.logger || bunyan.createLogger({name: 'blackhole', stream: streamBlackhole()});

		this._mode = MODE_NORMAL;

		// FIXME: Don't need to set this for every instance.
		this._modeHandler = {
			MODE_NORMAL: (ch) => {
				this._logger.trace(`Handle ${ch} in ${this._mode}`);

				if (ch === ESCAPE) {
					this._emitText();
					return this._changeMode(MODE_ESCAPE);
				}

				this._text = this._text.concat(ch);
			},

			MODE_ESCAPE: (ch) => {
				this._logger.trace(`Handle ${ch} in ${this._mode}`);

				ch = String.fromCharCode(ch);

				if (this._escapeHandler[ch] !== undefined) {
					return this._escapeHandler[ch].call(this);
				}

				this._logger.warn(`Unknown character sequence <ESC>${ch}`);
				this._changeMode(MODE_NORMAL);
			},

			MODE_CSI: (code) => {
				this._logger.trace(`Handle ${code} in ${this._mode}`);

				const c = String.fromCharCode(code);

				// https://en.wikipedia.org/wiki/ANSI_escape_code#Sequence_elements
				if (64 <= code && code <= 126) {
					if (this._csiHandler[c] !== undefined) {
						this._csiHandler[c].call(this);
					} else {
						this._logger.warn(`Unknown character sequence <ESC>[${c}`);
					}

					this._csiParams = [];
					this._changeMode(MODE_NORMAL);
				} else {
					this._csiParams = this._csiParams.concat(code);
				}
			},
		};

		// FIXME: Don't need to set this for every instance.
		this._escapeHandler = {
			'[': () => {
				this._changeMode(MODE_CSI);
			},

			'D': () => {
				this._termbuf.scrollUp(1);
				this._changeMode(MODE_NORMAL);
			},

			'E': () => {
				this._termbuf.handleCR();
				this._termbuf.handleLF();
				this._changeMode(MODE_NORMAL);
			},

			'M': () => {
				this._termbuf.scrollDown(1);
				this._changeMode(MODE_NORMAL);
			},
		};

		// FIXME: Don't need to set this for every instance.
		this._csiHandler = {
			'@': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.handleInsert(count);
			},

			'A': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.movePos(0, -count);
			},

			'B': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.movePos(0, count);
			},

			'C': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.movePos(count, 0);
			},

			'D': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.movePos(-count, 0);
			},

			'E': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.gotoHorizon(0);
				this._termbuf.movePos(0, count);
			},

			'F': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.gotoHorizon(0);
				this._termbuf.movePos(0, -count);
			},

			'G': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.gotoHorizon(count - 1);
			},

			'H': this._setPosition,

			'I': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.handleTab(count);
			},

			'J': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.handleClear(count);
			},

			'K': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.eraseLine(count);
			},

			'L': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.insertLine(count);
			},

			'M': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.deleteLine(count);
			},

			'P': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.handleDel(count);
			},

			'S': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.scrollUp(count);
			},

			'T': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.scrollDown(count);
			},

			'X': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.eraseChar(count);
			},

			'Z': () => {
				const count = getFirstParam(this._parseCsiParams());

				this._termbuf.handleBackTab(count);
			},

			'f': this._setPosition,

			'm': () => {
				const params = this._parseCsiParams();
				if (params.length === 0) {
					return this._termbuf.setAttribute(ATTR_RESET);
				}

				for (let x of params) {
					this._termbuf.setAttribute(x);
				}
			},

			'r': () => {
				const params = this._parseCsiParams();

				switch (params.length) {
					default:
					case 0:
						return this._termbuf.setScrollRegion(0, this._termbuf.getRow() - 1);

					case 1:
						return this._termbuf.setScrollRegion(0, (params[0] || 1) - 1);

					case 2:
						return this._termbuf.setScrollRegion((params[0] || 1) - 1, (params[1] || 1) - 1);
				}
			},

			's': () => {
				this._termbuf.saveCursor();
			},

			'u': () => {
				this._termbuf.restoreCursor();
			},
		};

		this._csiParams = [];
		this._text = [];
	}

	_setPosition() {
		const params = this._parseCsiParams();

		switch (params.length) {
			default:
			case 0:
				return this._termbuf.gotoPos(0, 0);

			case 1:
				return this._termbuf.gotoPos(0, (params[0] || 1) - 1);

			case 2:
				return this._termbuf.gotoPos((params[1] || 1) - 1, (params[0] || 1) - 1);
		}
	}

	_changeMode(mode) {
		this._logger.trace(`Change mode from ${this._mode} to ${mode}`);
		this._mode = mode;
	}

	_emitText() {
		if (this._text !== []) {
			this._termbuf.puts(convertArray2ArrayBuffer(this._text));
			this._text = [];
		}
	}

	_handleCh(ch) {
		this._logger.trace({ch}, '_handleCh');

		if (this._modeHandler[this._mode]) {
			return this._modeHandler[this._mode].call(this, ch);
		}

		this._logger.error(`Unknown mode ${this._mode}`);
	}

	_parseCsiParams() {
		const params = this._csiParams.map((x) => {
			return String.fromCharCode(x);
		}).join('');

		this._logger.trace(`CSI params string is ${params}`);

		if (params.length === 0) {
			return [];
		}

		return params.split(';').map((x) => {
			return parseInt(x, 10);
		});
	}

	parse(buffer) {
		this._logger.trace({buffer}, 'parse');

		if (!(buffer instanceof ArrayBuffer)) {
			throw new Error('buffer shall be ArrayBuffer');
		}

		for (let i = 0; i < buffer.byteLength; ++i) {
			this._handleCh(buffer[i]);
		}

		this._emitText();
	}
}
