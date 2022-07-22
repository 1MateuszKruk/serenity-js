import 'mocha';

import { expect } from '@integration/testing-tools';
import { Ensure } from '@serenity-js/assertions';
import { actorCalled, AssertionError, Wait } from '@serenity-js/core';
import { By, isSelected, Navigate, PageElement, PageElements } from '@serenity-js/web';

describe('isSelected', function () {

    const Elements = {
        nonExistent:            () => PageElement.located(By.id('does-not-exist')).describedAs('non-existent element'),
        nonExistentElements:    () => PageElements.located(By.id('does-not-exist')).describedAs('non-existent elements'),
        typeScript:             () => PageElement.located(By.css('select[name="languages"] > option[value="TypeScript"]')).describedAs('the TypeScript option'),
        javaScript:             () => PageElement.located(By.css('select[name="languages"] > option[value="JavaScript"]')).describedAs('the JavaScript option'),
        java:                   () => PageElement.located(By.css('select[name="languages"] > option[value="Java"]')).describedAs('the Java option'),
    };

    beforeEach(() =>
        actorCalled('Wendy').attemptsTo(
            Navigate.to('/expectations/is-selected/programming_languages.html'),
        ));

    describe('resolves to true when the element', () => {

        /** @test {isSelected} */
        it('is selected', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Wait.until(Elements.typeScript(), isSelected()),
                Ensure.that(Elements.typeScript(), isSelected()),
            )).to.be.fulfilled);
    });

    describe('resolves to false when the element', () => {

        /** @test {isSelected} */
        it('is not selected', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Ensure.that(Elements.javaScript(), isSelected()),
            )).to.be.rejectedWith(AssertionError, `Expected the JavaScript option to become selected`));

        /** @test {isSelected} */
        it('is not present', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Ensure.that(Elements.java(), isSelected()),
            )).to.be.rejectedWith(AssertionError, `Expected the Java option to become selected`));

        /** @test {isSelected} */
        it('does not exist', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Ensure.that(Elements.nonExistent(), isSelected()),
            )).to.be.rejectedWith(AssertionError, `Expected non-existent element to become present`));

        /** @test {isSelected} */
        it('does not exist in a list of PageElements', () =>
            expect(actorCalled('Wendy').attemptsTo(
                Ensure.that(Elements.nonExistentElements().first(), isSelected()),
            )).to.be.rejectedWith(AssertionError, `Expected the first of non-existent elements to become present`));
    });

    /** @test {isSelected} */
    it('contributes to a human-readable description of an assertion', () => {
        expect(Ensure.that(Elements.typeScript(), isSelected()).toString())
            .to.equal(`#actor ensures that the TypeScript option does become selected`);
    });

    /** @test {isSelected} */
    it('contributes to a human-readable description of a wait', () => {
        expect(Wait.until(Elements.typeScript(), isSelected()).toString())
            .to.equal(`#actor waits up to 5s, polling every 500ms, until the TypeScript option does become selected`);
    });
});
