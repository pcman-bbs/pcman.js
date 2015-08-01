import chai from 'chai';
import sinon from 'sinon';

import AnsiParser from '../lib/ansiparser';

const assert = chai.assert;

const ESC = '\x1b';
const CSI = `${ESC}[`;

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
			attr: {
				resetAttr: () => {},
			},
			curX: 0,
			curY: 0,
		};

		spy = {
			puts: sinon.spy(termbuf, 'puts'),
			scroll: sinon.spy(termbuf, 'scroll'),
			lineFeed: sinon.spy(termbuf, 'lineFeed'),
			carriageReturn: sinon.spy(termbuf, 'carriageReturn'),
			saveCursor: sinon.spy(termbuf, 'saveCursor'),
			restoreCursor: sinon.spy(termbuf, 'restoreCursor'),
			gotoPos: sinon.spy(termbuf, 'gotoPos'),
			attr: {
				resetAttr: sinon.spy(termbuf.attr, 'resetAttr')
			}
		};

		parser = new AnsiParser(termbuf);
	});

	describe('normal', () => {
		it('ASCII', () => {
			const input = 'This is a test ascii string.';
			const expected = input;

			parser.feed(input);

			assert.ok(spy.puts.calledOnce);
			assert.strictEqual(spy.puts.getCall(0).args[0], expected);
		});
	});

	describe('CSI', () => {
		// https://en.wikipedia.org/wiki/ANSI_escape_code#CSI_codes

		describe('[A] CUU – Cursor Up', () => {
			it ('default', () => {
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

			it ('has count', () => {
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
			it ('default', () => {
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

			it ('has count', () => {
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
			it ('default', () => {
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

			it ('has count', () => {
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
			it ('default', () => {
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

			it ('has count', () => {
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
			it ('default', () => {
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

			it ('has count', () => {
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
			it ('default', () => {
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

			it ('has count', () => {
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
			it('default', () => {
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

			it('has pos', () => {
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
			it ('no row/column', () => {
				const input = `${CSI}H`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it ('has row and column', () => {
				const row = 10;
				const column = 20;
				const input = `${CSI}${row};${column}H`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});
		});

		describe('[S] SU – Scroll Up', () => {
			it('default', () => {
				const input = `${CSI}S`;

				parser.feed(input);

				assert.ok(termbuf.scroll.calledOnce);
				assert.strictEqual(termbuf.scroll.getCall(0).args[0], false);
				assert.strictEqual(termbuf.scroll.getCall(0).args[1], 1);
			});

			it ('has page', () => {
				const page = 5;
				const input = `${CSI}${page}S`;

				parser.feed(input);

				assert.ok(termbuf.scroll.calledOnce);
				assert.strictEqual(termbuf.scroll.getCall(0).args[0], false);
				assert.strictEqual(termbuf.scroll.getCall(0).args[1], page);
			});
		});

		describe('[T] SD – Scroll Down', () => {
			it('default', () => {
				const input = `${CSI}T`;

				parser.feed(input);

				assert.ok(termbuf.scroll.calledOnce);
				assert.strictEqual(termbuf.scroll.getCall(0).args[0], true);
				assert.strictEqual(termbuf.scroll.getCall(0).args[1], 1);
			});

			it ('has page', () => {
				const page = 5;
				const input = `${CSI}${page}T`;

				parser.feed(input);

				assert.ok(termbuf.scroll.calledOnce);
				assert.strictEqual(termbuf.scroll.getCall(0).args[0], true);
				assert.strictEqual(termbuf.scroll.getCall(0).args[1], page);
			});
		});

		describe('[f] HVP – Horizontal and Vertical Position', () => {
			it ('no row/column', () => {
				const input = `${CSI}f`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);
			});

			it ('has row and column', () => {
				const row = 10;
				const column = 20;
				const input = `${CSI}${row};${column}f`;

				parser.feed(input);

				assert.ok(termbuf.gotoPos.calledOnce);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
				assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);
			});
		});

		describe('[m] SGR – Select Graphic Rendition', () => {
			it ('reset', () => {
				const input = `${CSI}0m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.ok(spy.attr.resetAttr.calledOnce);
			});

			it ('bright', () => {
				const input = `${CSI}1m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.bright, true);
			});

			it ('underline', () => {
				const input = `${CSI}4m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.underLine, true);
			});

			it ('blink 5', () => {
				const input = `${CSI}5m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.blink, true);
			});

			it ('blink 6', () => {
				const input = `${CSI}6m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.blink, true);
			});

			it ('invert', () => {
				const input = `${CSI}7m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.invert, true);
			});

			it ('foreground 30', () => {
				const input = `${CSI}30m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.fg, 0);
			});

			it ('foreground 37', () => {
				const input = `${CSI}37m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.fg, 7);
			});

			it ('background 40', () => {
				const input = `${CSI}40m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.bg, 0);
			});

			it ('background 47', () => {
				const input = `${CSI}47m`;

				parser.feed(input);

				assert.strictEqual(termbuf.attr.bg, 7);
			});
		});
	});

	describe('ESC', () => {
		it ('scroll up', () => {
			const input = `${ESC}D`;

			parser.feed(input);

			assert.ok(spy.scroll.calledOnce);
			assert.strictEqual(spy.scroll.getCall(0).args[0], false);
			assert.strictEqual(spy.scroll.getCall(0).args[1], 1);
		});

		it ('scroll down', () => {
			const input = `${ESC}M`;

			parser.feed(input);

			assert.ok(spy.scroll.calledOnce);
			assert.strictEqual(spy.scroll.getCall(0).args[0], true);
			assert.strictEqual(spy.scroll.getCall(0).args[1], 1);
		});

		it ('CR/LF', () => {
			const input = `${ESC}E`;

			parser.feed(input);

			// FIXME: How to test function call order?
			assert.ok(spy.lineFeed.calledOnce);
			assert.ok(spy.carriageReturn.calledOnce);
		});

		// FIXME: NOTREACHED
		// it ('save cursor', (done) => {
		// 	const input = '\x1b7';

		// 	let parser = new AnsiParser(termbuf);
		// 	parser.feed(input);

		// 	console.log(spy.saveCursor.callCount);

		// 	assert.ok(spy.saveCursor.calledOnce);

		// 	done();
		// });

		// FIXME: NOTREACHED
		// it ('restore cursor', (done) => {
		// 	const input = '\x1b8';

		// 	let parser = new AnsiParser(termbuf);
		// 	parser.feed(input);

		// 	assert.ok(spy.restoreCursor.calledOnce);

		// 	done();
		// });
	});

	describe('error', () => {
		it('no termbuf', () => {
			let parser = new AnsiParser();
			parser.feed('test');
		});
	});
});
