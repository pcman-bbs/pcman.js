import chai from 'chai';
import sinon from 'sinon';

import AnsiParser from '../lib/ansiparser';

const assert = chai.assert;

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
		};
		spy = {};

		for (let name of Object.keys(termbuf)) {
			spy[name] = sinon.spy(termbuf, name);
		}
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

	describe('ESC', () => {
		it ('scroll up', (done) => {
			const input = '\x1bD';

			let parser = new AnsiParser(termbuf);
			parser.feed(input);

			assert.ok(spy.scroll.calledOnce);
			assert.strictEqual(spy.scroll.getCall(0).args[0], false);
			assert.strictEqual(spy.scroll.getCall(0).args[1], 1);

			done();
		});

		it ('scroll down', (done) => {
			const input = '\x1bM';

			let parser = new AnsiParser(termbuf);
			parser.feed(input);

			assert.ok(spy.scroll.calledOnce);
			assert.strictEqual(spy.scroll.getCall(0).args[0], true);
			assert.strictEqual(spy.scroll.getCall(0).args[1], 1);

			done();
		});

		it ('CR/LF', (done) => {
			const input = '\x1bE';

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
