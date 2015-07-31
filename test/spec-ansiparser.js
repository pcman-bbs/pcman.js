import chai from 'chai';

import AnsiParser from '../lib/ansiparser';

const assert = chai.assert;

describe('AnsiParser', () => {
	describe('normal', () => {

	});

	describe('error', () => {
		it('no termbuf', (done) => {
			let parser = new AnsiParser();
			parser.feed('test');
			done();
		});
	});
});
