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
			scroll: () => {},
			lineFeed: () => {},
			carriageReturn: () => {},
			saveCursor: () => {},
			restoreCursor: () => {},
			gotoPos: () => {},
			eraseChar: () => {},
			insert: () => {},
			tab: () => {},
			clear: () => {},
			eraseLine: () => {},
			insertLine: () => {},
			deleteLine: () => {},
			del: () => {},
			backTab: () => {},
			setScrollRegion: () => {},
			attr: {
				resetAttr: () => {},
			},
			curX: 0,
			curY: 0,

			cols: 80,
			rows: 24,
		};

		spy = {
			puts: sinon.spy(termbuf, 'puts'),
			scroll: sinon.spy(termbuf, 'scroll'),
			lineFeed: sinon.spy(termbuf, 'lineFeed'),
			carriageReturn: sinon.spy(termbuf, 'carriageReturn'),
			saveCursor: sinon.spy(termbuf, 'saveCursor'),
			restoreCursor: sinon.spy(termbuf, 'restoreCursor'),
			gotoPos: sinon.spy(termbuf, 'gotoPos'),
			eraseChar: sinon.spy(termbuf, 'eraseChar'),
			insert: sinon.spy(termbuf, 'insert'),
			tab: sinon.spy(termbuf, 'tab'),
			clear: sinon.spy(termbuf, 'clear'),
			eraseLine: sinon.spy(termbuf, 'eraseLine'),
			insertLine: sinon.spy(termbuf, 'insertLine'),
			deleteLine: sinon.spy(termbuf, 'deleteLine'),
			del: sinon.spy(termbuf, 'del'),
			backTab: sinon.spy(termbuf, 'backTab'),
			setScrollRegion: sinon.spy(termbuf, 'setScrollRegion'),
			attr: {
				resetAttr: sinon.spy(termbuf.attr, 'resetAttr')
			}
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

		it.skip('ASCII + CSI + ASCII', () => {
			const text1 = 'hello';
			const text2 = 'world';

			parser.feed(`${text1}${CSI}E${text2}`);

			assert.ok(spy.puts.calledTwice);
			assert.ok(termbuf.gotoPos.calledOnce);

			assert.strictEqual(spy.puts.getCall(0).args[0], text1);
			assert.strictEqual(spy.puts.getCall(1).args[0], text2);
		});
	});

	describe('CSI', () => {
		// https://en.wikipedia.org/wiki/ANSI_escape_code#CSI_codes
		// http://ascii-table.com/ansi-escape-sequences-vt-100.php

		describe('[@]', () => {
			it.skip('default', () => {
				const input = `${CSI}@`;

				parser.feed(input);

				assert.ok(termbuf.insert.calledOnce);
				assert.strictEqual(termbuf.insert.getCall(0).args[0], 1);
			});

			it.skip('has count', () => {
				const count = 5;
				const input = `${CSI}${count}@`;

				parser.feed(input);

				assert.ok(termbuf.insert.calledOnce);
				assert.strictEqual(termbuf.insert.getCall(0).args[0], count);
			});
		});

		describe('[A] CUU – Cursor Up', () => {
			it.skip('default', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const input = `${CSI}A`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY - 1);
			});

			it.skip('has count', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const count = 5;
				const input = `${CSI}${count}A`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY - count);
			});
		});

		describe('[B] CUD – Cursor Down', () => {
			it.skip('default', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const input = `${CSI}B`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY + 1);
			});

			it.skip('has count', () => {
				const curX = 10;
				const curY = 20;
				termbuf.curX = curX;
				termbuf.curY = curY;

				const count = 5;
				const input = `${CSI}${count}B`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], curX);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], curY + count);
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

		describe('[H] CUP – Cursor Posit.skipion', () => {
			it.skip('no row/column', () => {
				const input = `${CSI}H`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it.skip('has row and column', () => {
				const row = 10;
				const column = 20;
				const input = `${CSI}${row};${column}H`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
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

		describe('[f] HVP – Horizontal and Vertical Posit.skipion', () => {
			it.skip('no row/column', () => {
				const input = `${CSI}f`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it.skip('has row and column', () => {
				const row = 10;
				const column = 20;
				const input = `${CSI}${row};${column}f`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});
		});

		describe('[m] SGR – Select Graphic Rendit.skipion', () => {
			it.skip('reset', () => {
				const input = `${CSI}0m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.ok(spy.attr.resetAttr.calledOnce);
			});

			it.skip('bright', () => {
				const input = `${CSI}1m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.bright, true);
			});

			it.skip('underline', () => {
				const input = `${CSI}4m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.underLine, true);
			});

			it.skip('blink 5', () => {
				const input = `${CSI}5m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.blink, true);
			});

			it.skip('blink 6', () => {
				const input = `${CSI}6m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.blink, true);
			});

			it.skip('invert', () => {
				const input = `${CSI}7m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.invert, true);
			});

			it.skip('foreground 30', () => {
				const input = `${CSI}30m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.fg, 0);
			});

			it.skip('foreground 37', () => {
				const input = `${CSI}37m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.fg, 7);
			});

			it.skip('background 40', () => {
				const input = `${CSI}40m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.bg, 0);
			});

			it.skip('background 47', () => {
				const input = `${CSI}47m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.bg, 7);
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
		it.skip('scroll up', () => {
			const input = `${ESC}D`;

			parser.feed(input);

			assert.ok(spy.scroll.calledOnce);
			assert.strictEqual(spy.scroll.getCall(0).args[0], false);
			assert.strictEqual(spy.scroll.getCall(0).args[1], 1);
		});

		it.skip('scroll down', () => {
			const input = `${ESC}M`;

			parser.feed(input);

			assert.ok(spy.scroll.calledOnce);
			assert.strictEqual(spy.scroll.getCall(0).args[0], true);
			assert.strictEqual(spy.scroll.getCall(0).args[1], 1);
		});

		it.skip('CR/LF', () => {
			const input = `${ESC}E`;

			parser.feed(input);

			// FIXME: How to test function call order?
			assert.ok(spy.lineFeed.calledOnce);
			assert.ok(spy.carriageReturn.calledOnce);
		});

		// FIXME: NOTREACHED
		// it.skip('save cursor', (done) => {
		// 	const input = '\x1b7';

		// 	let parser = new AnsiParser(termbuf);
		// 	parser.feed(input);

		// 	console.log(spy.saveCursor.callCount);

		// 	assert.ok(spy.saveCursor.calledOnce);

		// 	done();
		// });

		// FIXME: NOTREACHED
		// it.skip('restore cursor', (done) => {
		// 	const input = '\x1b8';

		// 	let parser = new AnsiParser(termbuf);
		// 	parser.feed(input);

		// 	assert.ok(spy.restoreCursor.calledOnce);

		// 	done();
		// });
	});

	describe('error', () => {
		it.skip('no termbuf', () => {
			let parser = new AnsiParser();
			parser.feed('test');
		});
	});
});
