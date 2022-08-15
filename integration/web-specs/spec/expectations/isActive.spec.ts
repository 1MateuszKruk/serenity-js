import 'mocha';

import { expect } from '@integration/testing-tools';
import { Ensure, isPresent, not } from '@serenity-js/assertions';
import { actorCalled, AssertionError, Duration, Wait } from '@serenity-js/core';
import { By, Click, isActive, Navigate, PageElement, PageElements } from '@serenity-js/web';

describe('isActive', function () {

    const Elements = {
        nonExistent:            () => PageElement.located(By.id('does-not-exist')).describedAs('non-existent element'),
        nonExistentElements:    () => PageElements.located(By.id('does-not-exist')).describedAs('non-existent elements'),
        activeInput:            () => PageElement.located(By.id('active')).describedAs('the active input'),
        autofocusedInput:       () => PageElement.located(By.id('autofocused')).describedAs('the autofocused input'),
        inactiveInput:          () => PageElement.located(By.id('inactive')).describedAs('the inactive input'),
    };

    beforeEach(() =>
        actorCalled('Wendy').attemptsTo(
            Navigate.to('/expectations/is-active/active_inactive_inputs.html'),
            Wait.upTo(Duration.ofSeconds(10))
                .until(Elements.autofocusedInput(), isPresent()),
        ));

    describe('resolves to true when the element', () => {

        /** @test {isActive} */
        it('is active', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Wait.until(Elements.autofocusedInput(), isActive()),
                Ensure.that(Elements.autofocusedInput(), isActive()),

                Ensure.that(Elements.inactiveInput(), not(isActive())),
                Click.on(Elements.inactiveInput()),

                Wait.until(Elements.inactiveInput(), isActive()),
                Ensure.that(Elements.inactiveInput(), isActive()),
            )).to.be.fulfilled);
    });

    describe('resolves to false when the element', () => {

        /** @test {isActive} */
        it('is inactive', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Ensure.that(Elements.inactiveInput(), isActive()),
            )).to.be.rejectedWith(AssertionError, `Expected the inactive input to become active`));

        /** @test {isActive} */
        it('does not exist', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Ensure.that(Elements.nonExistent(), isActive()),
            )).to.be.rejectedWith(AssertionError, `Expected non-existent element to become present`));

        /** @test {isActive} */
        it('does not exist in a list of PageElements', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Ensure.that(Elements.nonExistentElements().first(), isActive()),
            )).to.be.rejectedWith(AssertionError, `Expected the first of non-existent elements to become present`));
    });

    /** @test {isActive} */
    it('contributes to a human-readable description of an assertion', () => {
        expect(Ensure.that(Elements.activeInput(), isActive()).toString())
            .to.equal(`#actor ensures that the active input does become active`);
    });

    /** @test {isActive} */
    it('contributes to a human-readable description of a wait', () => {
        expect(Wait.until(Elements.activeInput(), isActive()).toString())
            .to.equal(`#actor waits up to 5s, polling every 500ms, until the active input does become active`);
    });
});
