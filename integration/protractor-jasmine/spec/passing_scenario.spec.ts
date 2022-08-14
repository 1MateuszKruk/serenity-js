import { expect, ifExitCodeIsOtherThan, logOutput, PickEvent } from '@integration/testing-tools';
import {
    AsyncOperationAttempted,
    AsyncOperationCompleted,
    SceneFinished,
    SceneFinishes,
    SceneStarts,
    SceneTagged,
    TestRunFinished,
    TestRunFinishes,
    TestRunnerDetected,
    TestRunStarts,
} from '@serenity-js/core/lib/events';
import { Description, ExecutionSuccessful, FeatureTag, Name, Timestamp } from '@serenity-js/core/lib/model';
import { describe, it } from 'mocha';

import { protractor } from '../src/protractor';

describe('@serenity-js/jasmine', function () {

    this.timeout(30000);

    it('recognises a passing scenario', () =>
        protractor(
            './examples/protractor.conf.js',
            '--specs=examples/passing.spec.js',
        )
        .then(ifExitCodeIsOtherThan(0, logOutput))
        .then(result => {

            expect(result.exitCode).to.equal(0);

            PickEvent.from(result.events)
                .next(TestRunStarts,            event => expect(event.timestamp).to.be.instanceof(Timestamp))
                .next(SceneStarts,              event => expect(event.details.name).to.equal(new Name('A scenario passes')))
                .next(SceneTagged,              event => expect(event.tag).to.equal(new FeatureTag('Jasmine')))
                .next(TestRunnerDetected,       event => expect(event.name).to.equal(new Name('Jasmine')))
                .next(AsyncOperationCompleted,  event => expect(event.taskDescription).to.equal(new Description('[BrowserDetector] Detected web browser details')))
                .next(SceneFinishes,            event => expect(event.details.name).to.equal(new Name('A scenario passes')))
                .next(AsyncOperationAttempted,  event => expect(event.taskDescription).to.equal(new Description('[ProtractorReporter] Invoking ProtractorRunner.afterEach...')))
                .next(AsyncOperationCompleted,  event => expect(event.taskDescription).to.equal(new Description('[ProtractorReporter] ProtractorRunner.afterEach succeeded')))
                .next(SceneFinished,            event => expect(event.outcome).to.equal(new ExecutionSuccessful()))
                .next(TestRunFinishes,          event => expect(event.timestamp).to.be.instanceof(Timestamp))
                .next(TestRunFinished,          event => expect(event.timestamp).to.be.instanceof(Timestamp))
            ;
        }));
});
