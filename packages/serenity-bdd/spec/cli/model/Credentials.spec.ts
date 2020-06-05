import 'mocha';

import { expect } from '@integration/testing-tools';
import { Path } from '@serenity-js/core/lib/io';

import { Credentials, GAV } from '../../../src/cli/model';

describe('Credentials', () => {

    it('defaults to "no credentials" if the credentials are not specified', () => {
        const credentials = Credentials.fromString(undefined);

        expect(credentials.username).to.equal(undefined);
        expect(credentials.password).to.equal(undefined);
    });

    it('defaults to "no credentials" if the credentials are empty', () => {
        const credentials = Credentials.fromString('');

        expect(credentials.username).to.equal(undefined);
        expect(credentials.password).to.equal(undefined);
    });

    it('complains if the credentials string does not follow the <username>:<password> template', () => {

        expect(() => Credentials.fromString('invalid'))
            .to.throw(Error, 'Credentials should follow the "<username>:<password>" format')
    });
});
