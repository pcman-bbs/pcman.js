import chai from 'chai';
import sinon from 'sinon';

import AnsiParser from '../lib/ansiparser';

const assert = chai.assert;

const ESC = '\x1b';
const CSI = `${ESC}[`;

describe('AnsiParser', () => {
	let termbuf;
	let spy;

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
	});

	describe('normal', () => {
		it('ASCII', (done) => {
			const input = 'This is a test ascii string.';
			const expected = input;

			let parser = new AnsiParser(termbuf);
			parser.feed(input);

			assert.ok(spy.puts.calledOnce);
			assert.strictEqual(spy.puts.getCall(0).args[0], expected);

			done();
		});
	});

	describe('CSI', () => {
		describe('Cursor Control', () => {
			describe('Cursor Home', (done) => {
				it ('no row/column', (done) => {
					const input = `${CSI}H`;

					let parser = new AnsiParser(termbuf);
					parser.feed(input);

					assert.ok(termbuf.gotoPos.calledOnce);
					assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], 0);
					assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], 0);

					done();
				});

				it ('has row and column', (done) => {
					const row = 10;
					const column = 20;
					const input = `${CSI}${row};${column}H`;

					let parser = new AnsiParser(termbuf);
					parser.feed(input);

					assert.ok(termbuf.gotoPos.calledOnce);
					assert.strictEqual(termbuf.gotoPos.getCall(0).args[0], column - 1);
					assert.strictEqual(termbuf.gotoPos.getCall(0).args[1], row - 1);

					done();
				});
			});
		});

		describe('Set Display Attributes', () => {
			it ('reset', (done) => {
				const input = `${CSI}0m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.ok(spy.attr.resetAttr.calledOnce);

				done();
			});

			it ('bright', (done) => {
				const input = `${CSI}1m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.bright, true);

				done();
			});

			it ('underline', (done) => {
				const input = `${CSI}4m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.underLine, true);

				done();
			});

			it ('blink 5', (done) => {
				const input = `${CSI}5m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.blink, true);

				done();
			});

			it ('blink 6', (done) => {
				const input = `${CSI}6m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.blink, true);

				done();
			});

			it ('invert', (done) => {
				const input = `${CSI}7m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.invert, true);

				done();
			});

			it ('foreground 30', (done) => {
				const input = `${CSI}30m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.fg, 0);

				done();
			});

			it ('foreground 37', (done) => {
				const input = `${CSI}37m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.fg, 7);

				done();
			});

			it ('background 40', (done) => {
				const input = `${CSI}40m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.bg, 0);

				done();
			});

			it ('background 47', (done) => {
				const input = `${CSI}47m`;

				let parser = new AnsiParser(termbuf);
				parser.feed(input);

				assert.strictEqual(termbuf.attr.bg, 7);

				done();
			});
		});
	});

	describe('ESC', () => {
		it ('scroll up', (done) => {
			const input = `${ESC}D`;

			let parser = new AnsiParser(termbuf);
			parser.feed(input);

			assert.ok(spy.scroll.calledOnce);
			assert.strictEqual(spy.scroll.getCall(0).args[0], false);
			assert.strictEqual(spy.scroll.getCall(0).args[1], 1);

			done();
		});

		it ('scroll down', (done) => {
			const input = `${ESC}M`;

			let parser = new AnsiParser(termbuf);
			parser.feed(input);

			assert.ok(spy.scroll.calledOnce);
			assert.strictEqual(spy.scroll.getCall(0).args[0], true);
			assert.strictEqual(spy.scroll.getCall(0).args[1], 1);

			done();
		});

		it ('CR/LF', (done) => {
			const input = `${ESC}E`;

			let parser = new AnsiParser(termbuf);
			parser.feed(input);

			// FIXME: How to test function call order?
			assert.ok(spy.lineFeed.calledOnce);
			assert.ok(spy.carriageReturn.calledOnce);

			done();
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
		it('no termbuf', (done) => {
			let parser = new AnsiParser();
			parser.feed('test');
			done();
		});
	});
});
