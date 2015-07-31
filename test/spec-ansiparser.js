import chai from 'chai';
import sinon from 'sinon';

import AnsiParser from '../lib/ansiparser';

const assert = chai.assert;

describe('AnsiParser', () => {
	describe('normal', () => {
		let termbuf = { puts: () => {} };
		let spy = sinon.spy(termbuf, 'puts');

		it('input ASCII', (done) => {
			const input = 'This is a test ascii string.';
			const expected = input;

			let parser = new AnsiParser(termbuf);
			parser.feed(input);

			assert.ok(spy.calledOnce);
			assert.strictEqual(spy.getCall(0).args[0], expected);

			done();
		});

	});

	describe('error', () => {
		it('no termbuf', (done) => {
			let parser = new AnsiParser();
			parser.feed('test');
			done();
		});
	});
});
