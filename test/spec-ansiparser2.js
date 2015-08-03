/*
 * Copytight 2015 ChangZhuo Chen (陳昌倬) <czchen@gmail.com>
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
import chai from 'chai';
import sinon from 'sinon';

import AnsiParser from '../lib/ansiparser2';

import {
	ATTR_RESET,
	ATTR_BRIGHT,
	ATTR_DIM,
	ATTR_UNDERLINE,
	ATTR_BLINK_5,
	ATTR_BLINK_6,
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
} from '../lib/const';

const assert = chai.assert;

const ESC = '\x1b';
const CSI = `${ESC}[`;

const str2ab = (str) => {
	let buf = new ArrayBuffer(str.length);

	for (let i = 0; i < str.length; ++i) {
		buf[i] = str.charCodeAt(i);
	}

	return buf;
};

describe('AnsiParser', () => {
	let termbuf;
	let spy;
	let parser;

	beforeEach(() => {
		termbuf = {
			puts: () => {},
			scrollUp: () => {},
			scrollDown: () => {},

			handleCR: () => {},
			handleLF: () => {},
			handleInsert: () => {},

			setAttribute: () => {},

			gotoPos: () => {},
			movePos: () => {},
		};

		spy = {
			puts: sinon.spy(termbuf, 'puts'),
			scrollUp: sinon.spy(termbuf, 'scrollUp'),
			scrollDown: sinon.spy(termbuf, 'scrollDown'),

			handleCR: sinon.spy(termbuf, 'handleCR'),
			handleLF: sinon.spy(termbuf, 'handleLF'),
			handleInsert: sinon.spy(termbuf, 'handleInsert'),

			setAttribute: sinon.spy(termbuf, 'setAttribute'),

			gotoPos: sinon.spy(termbuf, 'gotoPos'),
			movePos: sinon.spy(termbuf, 'movePos'),
		};

		let logger;
		// logger = bunyan.createLogger({
		// 	name: 'test',
		// 	stream: process.stdout,
		// 	level: 'trace',
		// });

		parser = new AnsiParser(termbuf, {logger: logger});
	});

	describe('normal', () => {
		it('ASCII', () => {
			const input = str2ab('This is a test ascii string.');
			const expected = input;

			parser.parse(input);

			assert.ok(spy.puts.calledOnce);
			assert.deepEqual(spy.puts.getCall(0).args[0], expected);
		});

		it('ASCII + ESC + ASCII', () => {
			const text1 = 'hello';
			const text2 = 'world';

			parser.parse(str2ab(`${text1}${ESC}D${text2}`));

			assert.ok(spy.puts.calledTwice);
			assert.ok(termbuf.scrollUp.calledOnce);

			assert.deepEqual(spy.puts.getCall(0).args[0], str2ab(text1));
			assert.deepEqual(spy.puts.getCall(1).args[0], str2ab(text2));
		});

		it('ASCII + CSI + ASCII', () => {
			const text1 = 'hello';
			const text2 = 'world';

			parser.parse(str2ab(`${text1}${CSI}H${text2}`));

			assert.ok(spy.puts.calledTwice);
			assert.ok(termbuf.gotoPos.calledOnce);

			assert.deepEqual(spy.puts.getCall(0).args[0], str2ab(text1));
			assert.deepEqual(spy.puts.getCall(1).args[0], str2ab(text2));
		});
	});

	describe('CSI', () => {
		// https://en.wikipedia.org/wiki/ANSI_escape_code#CSI_codes
		// http://ascii-table.com/ansi-escape-sequences-vt-100.php

		describe('[@]', () => {
			it('default', () => {
				parser.parse(str2ab(`${CSI}@`));

				assert.ok(termbuf.handleInsert.calledOnce);
				assert.strictEqual(termbuf.handleInsert.getCall(0).args[0], 1);
			});

			it('has count', () => {
				const count = 5;

				parser.parse(str2ab(`${CSI}${count}@`));

				assert.ok(termbuf.handleInsert.calledOnce);
				assert.strictEqual(termbuf.handleInsert.getCall(0).args[0], count);
			});
		});

		describe('[A] CUU – Cursor Up', () => {
			it('default', () => {
				parser.parse(str2ab(`${CSI}A`));

				assert.ok(termbuf.movePos.calledOnce);

				assert.strictEqual(termbuf.movePos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.movePos.getCall(0).args[1], -1);
			});

			it('has count', () => {
				const count = 5;

				parser.parse(str2ab(`${CSI}${count}A`));

				assert.ok(termbuf.movePos.calledOnce);

				assert.strictEqual(termbuf.movePos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.movePos.getCall(0).args[1], -count);
			});
		});

		describe('[B] CUD – Cursor Down', () => {
			it('default', () => {
				parser.parse(str2ab(`${CSI}B`));

				assert.ok(termbuf.movePos.calledOnce);

				assert.strictEqual(termbuf.movePos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.movePos.getCall(0).args[1], 1);
			});

			it('has count', () => {
				const count = 5;

				parser.parse(str2ab(`${CSI}${count}B`));

				assert.ok(termbuf.movePos.calledOnce);

				assert.strictEqual(termbuf.movePos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.movePos.getCall(0).args[1], count);
			});
		});

		describe('[C] CUF – Cursor Forward', () => {
			it.skip('default', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const input = `${CSI}C`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX + 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY);
			});

			it.skip('has count', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const count = 5;
				const input = `${CSI}${count}C`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX + count);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY);
			});
		});

		describe('[D] CUB – Cursor Back', () => {
			it.skip('default', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const input = `${CSI}D`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY);
			});

			it.skip('has count', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const count = 5;
				const input = `${CSI}${count}D`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX - count);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY);
			});
		});

		describe('[E] CNL – Cursor Next Line', () => {
			it.skip('default', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const input = `${CSI}E`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY + 1);
			});

			it.skip('has count', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const count = 5;
				const input = `${CSI}${count}E`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY + count);
			});
		});

		describe('[F] CPL – Cursor Previous Line', () => {
			it.skip('default', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const input = `${CSI}F`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY - 1);
			});

			it.skip('has count', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const count = 5;
				const input = `${CSI}${count}F`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY - count);
			});
		});

		describe('[G] CHA – Cursor Horizontal Absolute', () => {
			it.skip('default', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const input = `${CSI}G`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY);
			});

			it.skip('has pos', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const pos = 5;
				const input = `${CSI}${pos}G`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], pos - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY);
			});
		});

		describe('[H] CUP – Cursor Position', () => {
			it('no row/column', () => {
				parser.parse(str2ab(`${CSI}H`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it('has row', () => {
				const row = 10;

				parser.parse(str2ab(`${CSI}${row}H`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});

			it('has row and column', () => {
				const row = 10;
				const column = 20;

				parser.parse(str2ab(`${CSI}${row};${column}H`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});

			it('bad row', () => {
				const row = '?';
				const column = 20;

				parser.parse(str2ab(`${CSI}${row};${column}H`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it('bad column', () => {
				const row = 10;
				const column = '?';

				parser.parse(str2ab(`${CSI}${row};${column}H`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});
		});

		describe('[I]', () => {
			it.skip('default', () => {
				const input = `${CSI}I`;

				parser.feed(input);

				assert.ok(termbuf.tab.calledOnce);
				assert.strictEqual(termbuf.tab.getCall(0).args[0], 1);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}I`;

				parser.feed(input);

				assert.ok(termbuf.tab.calledOnce);
				assert.strictEqual(termbuf.tab.getCall(0).args[0], count);
			});
		});

		describe('[J]', () => {
			it.skip('default', () => {
				const input = `${CSI}J`;

				parser.feed(input);

				assert.ok(termbuf.clear.calledOnce);
				assert.strictEqual(termbuf.clear.getCall(0).args[0], 0);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}J`;

				parser.feed(input);

				assert.ok(termbuf.clear.calledOnce);
				assert.strictEqual(termbuf.clear.getCall(0).args[0], count);
			});
		});

		describe('[K]', () => {
			it.skip('default', () => {
				const input = `${CSI}K`;

				parser.feed(input);

				assert.ok(termbuf.eraseLine.calledOnce);
				assert.strictEqual(termbuf.eraseLine.getCall(0).args[0], 0);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}K`;

				parser.feed(input);

				assert.ok(termbuf.eraseLine.calledOnce);
				assert.strictEqual(termbuf.eraseLine.getCall(0).args[0], count);
			});
		});

		describe('[L]', () => {
			it.skip('default', () => {
				const input = `${CSI}L`;

				parser.feed(input);

				assert.ok(termbuf.insertLine.calledOnce);
				assert.strictEqual(termbuf.insertLine.getCall(0).args[0], 1);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}L`;

				parser.feed(input);

				assert.ok(termbuf.insertLine.calledOnce);
				assert.strictEqual(termbuf.insertLine.getCall(0).args[0], count);
			});
		});

		describe('[M]', () => {
			it.skip('default', () => {
				const input = `${CSI}M`;

				parser.feed(input);

				assert.ok(termbuf.deleteLine.calledOnce);
				assert.strictEqual(termbuf.deleteLine.getCall(0).args[0], 1);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}M`;

				parser.feed(input);

				assert.ok(termbuf.deleteLine.calledOnce);
				assert.strictEqual(termbuf.deleteLine.getCall(0).args[0], count);
			});
		});

		describe('[P]', () => {
			it.skip('default', () => {
				const input = `${CSI}P`;

				parser.feed(input);

				assert.ok(termbuf.del.calledOnce);
				assert.strictEqual(termbuf.del.getCall(0).args[0], 1);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}P`;

				parser.feed(input);

				assert.ok(termbuf.del.calledOnce);
				assert.strictEqual(termbuf.del.getCall(0).args[0], count);
			});
		});

		describe('[S] SU – Scroll Up', () => {
			it.skip('default', () => {
				const input = `${CSI}S`;

				parser.feed(input);

				assert.ok(termbuf.scroll.calledOnce);
				assert.strictEqual(termbuf.scroll.getCall(0).args[0], false);
				assert.strictEqual(termbuf.scroll.getCall(0).args[1], 1);
			});

			it.skip('has page', () => {
				const page = 5;
				const input = `${CSI}${page}S`;

				parser.feed(input);

				assert.ok(termbuf.scroll.calledOnce);
				assert.strictEqual(termbuf.scroll.getCall(0).args[0], false);
				assert.strictEqual(termbuf.scroll.getCall(0).args[1], page);
			});
		});

		describe('[T] SD – Scroll Down', () => {
			it.skip('default', () => {
				const input = `${CSI}T`;

				parser.feed(input);

				assert.ok(termbuf.scroll.calledOnce);
				assert.strictEqual(termbuf.scroll.getCall(0).args[0], true);
				assert.strictEqual(termbuf.scroll.getCall(0).args[1], 1);
			});

			it.skip('has page', () => {
				const page = 5;
				const input = `${CSI}${page}T`;

				parser.feed(input);

				assert.ok(termbuf.scroll.calledOnce);
				assert.strictEqual(termbuf.scroll.getCall(0).args[0], true);
				assert.strictEqual(termbuf.scroll.getCall(0).args[1], page);
			});
		});

		describe('[X]', () => {
			it.skip('default', () => {
				const input = `${CSI}X`;

				parser.feed(input);

				assert.ok(termbuf.eraseChar.calledOnce);
				assert.strictEqual(termbuf.eraseChar.getCall(0).args[0], 1);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}X`;

				parser.feed(input);

				assert.ok(termbuf.eraseChar.calledOnce);
				assert.strictEqual(termbuf.eraseChar.getCall(0).args[0], count);
			});
		});

		describe('[Z]', () => {
			it.skip('default', () => {
				const input = `${CSI}Z`;

				parser.feed(input);

				assert.ok(termbuf.backTab.calledOnce);
				assert.strictEqual(termbuf.backTab.getCall(0).args[0], 1);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}Z`;

				parser.feed(input);

				assert.ok(termbuf.backTab.calledOnce);
				assert.strictEqual(termbuf.backTab.getCall(0).args[0], count);
			});
		});

		describe('[d]', () => {
			it.skip('default', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const input = `${CSI}d`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it.skip('has column', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const column = 5;
				const input = `${CSI}${column}d`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], column - 1);
			});
		});

		describe('[f] HVP – Horizontal and Vertical Position', () => {
			it('no row/column', () => {
				parser.parse(str2ab(`${CSI}f`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it('has row', () => {
				const row = 10;

				parser.parse(str2ab(`${CSI}${row}f`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});

			it('has row and column', () => {
				const row = 10;
				const column = 20;

				parser.parse(str2ab(`${CSI}${row};${column}f`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});

			it('bad row', () => {
				const row = '?';
				const column = 20;

				parser.parse(str2ab(`${CSI}${row};${column}f`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it('bad column', () => {
				const row = 10;
				const column = '?';

				parser.parse(str2ab(`${CSI}${row};${column}f`));

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});
		});

		describe('[m] SGR – Select Graphic Rendition', () => {
			it('default', () => {
				parser.parse(str2ab(`${ESC}[m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], ATTR_RESET);
			});

			it('reset', () => {
				parser.parse(str2ab(`${ESC}[0m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], ATTR_RESET);
			});

			it('bright', () => {
				parser.parse(str2ab(`${ESC}[1m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], ATTR_BRIGHT);
			});

			it('underline', () => {
				parser.parse(str2ab(`${ESC}[4m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], ATTR_UNDERLINE);
			});

			it('blink 5', () => {
				parser.parse(str2ab(`${ESC}[5m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], ATTR_BLINK_5);
			});

			it('blink 6', () => {
				parser.parse(str2ab(`${ESC}[6m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], ATTR_BLINK_6);
			});

			it('invert', () => {
				parser.parse(str2ab(`${ESC}[7m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], ATTR_REVERSE);
			});

			it('0;1;4;5;6;7', () => {
				parser.parse(str2ab(`${ESC}[0;1;4;5;6;7m`));

				assert.strictEqual(spy.setAttribute.callCount, 6);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], 0);
				assert.strictEqual(spy.setAttribute.getCall(1).args[0], 1);
				assert.strictEqual(spy.setAttribute.getCall(2).args[0], 4);
				assert.strictEqual(spy.setAttribute.getCall(3).args[0], 5);
				assert.strictEqual(spy.setAttribute.getCall(4).args[0], 6);
				assert.strictEqual(spy.setAttribute.getCall(5).args[0], 7);
			});

			it('foreground black', () => {
				const color = COLOR_FOREGROUND + COLOR_BLACK;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('foreground red', () => {
				const color = COLOR_FOREGROUND + COLOR_RED;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('foreground green', () => {
				const color = COLOR_FOREGROUND + COLOR_GREEN;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('foreground yellow', () => {
				const color = COLOR_FOREGROUND + COLOR_YELLOW;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('foreground blue', () => {
				const color = COLOR_FOREGROUND + COLOR_BLUE;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('foreground magenta', () => {
				const color = COLOR_FOREGROUND + COLOR_MAGENTA;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('foreground cyan', () => {
				const color = COLOR_FOREGROUND + COLOR_CYAN;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('foreground white', () => {
				const color = COLOR_FOREGROUND + COLOR_WHITE;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('background black', () => {
				const color = COLOR_BACKGROUND + COLOR_BLACK;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('background red', () => {
				const color = COLOR_BACKGROUND + COLOR_RED;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('background green', () => {
				const color = COLOR_BACKGROUND + COLOR_GREEN;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('background yellow', () => {
				const color = COLOR_BACKGROUND + COLOR_YELLOW;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('background blue', () => {
				const color = COLOR_BACKGROUND + COLOR_BLUE;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('background magenta', () => {
				const color = COLOR_BACKGROUND + COLOR_MAGENTA;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('background cyan', () => {
				const color = COLOR_BACKGROUND + COLOR_CYAN;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});

			it('background white', () => {
				const color = COLOR_BACKGROUND + COLOR_WHITE;

				parser.parse(str2ab(`${CSI}${color}m`));

				assert.ok(spy.setAttribute.calledOnce);

				assert.strictEqual(spy.setAttribute.getCall(0).args[0], color);
			});
		});

		describe('[r]', () => {
			it.skip('default', () => {
				const input = `${CSI}r`;

				parser.feed(input);

				assert.ok(termbuf.setScrollRegion.calledOnce);
				assert.strictEqual(termbuf.setScrollRegion.getCall(0).args[0], 0);
				// FIXME: This is bug in ansiparser
				// assert.strictEqual(termbuf.setScrollRegion.getCall(0).args[1], termbuf.rows - 1);
			});

			it.skip('has end', () => {
				const end = 10;
				const input = `${CSI}${end}r`;

				parser.feed(input);

				assert.ok(termbuf.setScrollRegion.calledOnce);
				assert.strictEqual(termbuf.setScrollRegion.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.setScrollRegion.getCall(0).args[1], end - 1);
			});

			it.skip('has start and end', () => {
				const start = 5;
				const end = 10;
				const input = `${CSI}${start};${end}r`;

				parser.feed(input);

				assert.ok(termbuf.setScrollRegion.calledOnce);
				assert.strictEqual(termbuf.setScrollRegion.getCall(0).args[0], start - 1);
				assert.strictEqual(termbuf.setScrollRegion.getCall(0).args[1], end - 1);
			});
		});

		it.skip('[s]', () => {
			const input = `${CSI}s`;

			parser.feed(input);

			assert.ok(termbuf.saveCursor.calledOnce);
		});

		it.skip('[u]', () => {
			const input = `${CSI}u`;

			parser.feed(input);

			assert.ok(termbuf.restoreCursor.calledOnce);
		});
	});

	describe('ESC', () => {
		it('scroll up', () => {
			parser.parse(str2ab(`${ESC}D`));

			assert.ok(spy.scrollUp.calledOnce);
			assert.strictEqual(spy.scrollUp.getCall(0).args[0], 1);
		});

		it('scroll down', () => {
			parser.parse(str2ab(`${ESC}M`));

			assert.ok(spy.scrollDown.calledOnce);
			assert.strictEqual(spy.scrollDown.getCall(0).args[0], 1);
		});

		it('CR/LF', () => {
			parser.parse(str2ab(`${ESC}E`));

			// FIXME: How to test function call order?
			assert.ok(spy.handleCR.calledOnce);
			assert.ok(spy.handleLF.calledOnce);
		});
	});

	describe('error', () => {
		it('no termbuf', () => {
			assert.throws(() => {
				let parser = new AnsiParser();
			}, 'termbuf');
		});
	});
});
