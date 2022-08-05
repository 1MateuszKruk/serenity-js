import { beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';
import { Writable } from 'stream';

import { Actor, Cast, Clock, Duration, Stage, StageManager, StreamReporter } from '../../../../src';
import { TestRunFinished } from '../../../../src/events';
import { Timestamp } from '../../../../src/model';
import { expect } from '../../../expect';

describe('StreamReporter', () => {

    let stage:          Stage,
        output:         sinon.SinonStubbedInstance<Writable>;

    class Extras implements Cast {
        prepare(actor: Actor): Actor {
            return actor;
        }
    }

    beforeEach(() => {
        stage = new Stage(
            new Extras(),
            new StageManager(Duration.ofSeconds(2), new Clock()),
        );

        output = sinon.createStubInstance(Writable);
    });

    it('prints the events it receives to output stream', () => {
        const reporter = new StreamReporter(output as unknown as Writable, stage);
        stage.assign(reporter);

        stage.announce(new TestRunFinished(Timestamp.fromJSON('2021-01-13T18:00:00Z')));

        expect(output.write).to.have.been.calledWith(
            `{"type":"TestRunFinished","event":"2021-01-13T18:00:00.000Z"}\n`
        );
    });
});
