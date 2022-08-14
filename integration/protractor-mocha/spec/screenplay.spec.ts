import { expect, ifExitCodeIsOtherThan, logOutput, PickEvent } from '@integration/testing-tools';
import { AsyncOperationAttempted, AsyncOperationCompleted, InteractionStarts, SceneFinished, SceneFinishes, SceneStarts, SceneTagged, TestRunnerDetected } from '@serenity-js/core/lib/events';
import { Description, ExecutionSuccessful, FeatureTag, Name } from '@serenity-js/core/lib/model';
import { describe, it } from 'mocha';

import { protractor } from '../src/protractor';

describe('@serenity-js/mocha', function () {

    this.timeout(30000);

    it('correctly reports on Screenplay scenarios', () =>
        protractor(
            './examples/protractor.conf.js',
            '--specs=examples/screenplay.spec.js',
        )
        .then(ifExitCodeIsOtherThan(0, logOutput))
        .then(result => {

            expect(result.exitCode).to.equal(0);

            PickEvent.from(result.events)
                .next(SceneStarts,              event => expect(event.details.name).to.equal(new Name('A screenplay scenario passes')))
                .next(SceneTagged,              event => expect(event.tag).to.equal(new FeatureTag('Mocha')))
                .next(TestRunnerDetected,       event => expect(event.name).to.equal(new Name('Mocha')))
                .next(InteractionStarts,        event => expect(event.details.name).to.equal(new Name(`Mocha disables synchronisation with Angular`)))
                .next(InteractionStarts,        event => expect(event.details.name).to.equal(new Name(`Mocha navigates to 'chrome://version/'`)))
                .next(InteractionStarts,        event => expect(event.details.name).to.equal(new Name(`Mocha navigates to 'chrome://accessibility/'`)))
                .next(InteractionStarts,        event => expect(event.details.name).to.equal(new Name(`Mocha navigates to 'chrome://chrome-urls/'`)))

                .next(SceneFinishes,            event => expect(event.details.name).to.equal(new Name('A screenplay scenario passes')))
                .next(AsyncOperationAttempted,  event => expect(event.taskDescription).to.equal(new Description('[ProtractorReporter] Invoking ProtractorRunner.afterEach...')))
                .next(AsyncOperationCompleted,  event => expect(event.taskDescription).to.equal(new Description('[ProtractorReporter] ProtractorRunner.afterEach succeeded')))
                .next(AsyncOperationAttempted,  event => expect(event.taskDescription).to.equal(new Description('[Stage] Dismissing Mocha...')))
                .next(AsyncOperationCompleted,  event => expect(event.taskDescription).to.equal(new Description('[Stage] Dismissed Mocha successfully')))
                .next(SceneFinished,            event => expect(event.outcome).to.equal(new ExecutionSuccessful()))
            ;
        }));
});
