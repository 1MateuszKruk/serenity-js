import { LogicError } from '@serenity-js/core';
import { PageElement, SelectOption, SwitchableOrigin } from '@serenity-js/web';
import * as scripts from '@serenity-js/web/lib/scripts';
import { by, ElementFinder, protractor } from 'protractor';
import { Locator, WebElement } from 'selenium-webdriver';

import { promised } from '../promised';

/**
 * @extends {@serenity-js/web/lib/screenplay/models~PageElement}
 */
export class ProtractorPageElement extends PageElement<ElementFinder> {

    of(parent: ProtractorPageElement): PageElement<ElementFinder> {
        return new ProtractorPageElement(this.locator.of(parent.locator));
    }

    async clearValue(): Promise<void> {
        async function removeCharactersFrom(elf: ElementFinder, numberOfCharacters: number): Promise<void> {
            if (numberOfCharacters > 0) {
                await elf.sendKeys(
                    protractor.Key.END,
                    ...times(numberOfCharacters, protractor.Key.BACK_SPACE),
                );
            }
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        function times(length: number, key: string) {
            return Array.from({ length }).map(() => key);
        }

        const currentValue = await this.value();

        if (currentValue !== null && currentValue !== undefined) {
            const element = await this.nativeElement();
            return removeCharactersFrom(element, currentValue.length);
        }
    }

    async click(): Promise<void> {
        const element: ElementFinder = await this.nativeElement();

        return promised(element.click());
    }

    async doubleClick(): Promise<void> {
        const element: ElementFinder = await this.nativeElement();
        const webElement: WebElement = await element.getWebElement();

        return promised(
            webElement.getDriver().actions()
                .mouseMove(webElement)
                .doubleClick()
                .perform(),
        );
    }

    async enterValue(value: string | number | Array<string | number>): Promise<void> {
        const element: ElementFinder = await this.nativeElement();

        return promised(element.sendKeys(
            [].concat(value).join(''),
        ));
    }

    async scrollIntoView(): Promise<void> {
        const element: ElementFinder = await this.nativeElement();
        const webElement: WebElement = await element.getWebElement();

        return promised(
            webElement.getDriver().executeScript('arguments[0].scrollIntoView(true);', webElement),
        );
    }

    async hoverOver(): Promise<void> {
        const element: ElementFinder = await this.nativeElement();
        const webElement: WebElement = await element.getWebElement();

        return promised(
            webElement.getDriver().actions()
                .mouseMove(webElement)
                .perform(),
        );
    }

    async rightClick(): Promise<void> {
        const element: ElementFinder = await this.nativeElement();
        const webElement: WebElement = await element.getWebElement();

        return promised(
            webElement.getDriver().actions()
                .mouseMove(webElement)
                .click(protractor.Button.RIGHT)
                .perform(),
        );
    }

    async selectOptions(...options: SelectOption[]): Promise<void> {
        const element: ElementFinder = await this.nativeElement();

        for (const option of options) {
            if (option.value) {
                await promised(element.element(by.xpath(`//option[@value='${ option.value }']`) as Locator).click());
            }
            else if (option.label) {
                await promised(element.element(by.cssContainingText('option', option.label) as Locator).click());
            }
        }
    }

    async selectedOptions(): Promise<SelectOption[]> {
        const element: ElementFinder = await this.locator.nativeElement();

        const webElement = await element.getWebElement();

        const browser = element.browser_;

        const options: Array<{ label: string, value: string, selected: boolean, disabled: boolean }> = await browser.executeScript(
            /* istanbul ignore next */
            (select: HTMLSelectElement) => {
                const options = [];
                select.querySelectorAll('option').forEach((option: HTMLOptionElement) => {
                    options.push({
                        selected:   option.selected,
                        disabled:   option.disabled,
                        label:      option.label,
                        value:      option.value,
                    });
                });

                return options;
            },
            webElement as unknown
        );

        return options.map(option =>
            new SelectOption(option.label, option.value, option.selected, option.disabled)
        );
    }

    async attribute(name: string): Promise<string> {
        const element: ElementFinder = await this.nativeElement();

        return promised(element.getAttribute(name));
    }

    async text(): Promise<string> {
        const element: ElementFinder = await this.nativeElement();

        return promised(element.getText());
    }

    async value(): Promise<string> {
        const element: ElementFinder = await this.nativeElement();
        const webElement: WebElement = await element.getWebElement();

        return promised(webElement.getDriver().executeScript(
            /* istanbul ignore next */
            function getValue(webElement) {
                return webElement.value;
            },
            webElement,
        ));
    }

    async switchTo(): Promise<SwitchableOrigin> {
        const element: ElementFinder = await this.locator.nativeElement();

        try {
            // https://github.com/angular/protractor/issues/1846#issuecomment-82634739;
            const webElement = await element.getWebElement();

            const tagName = await element.getTagName();

            const browser = element.browser_;

            if ([ 'iframe', 'frame' ].includes(tagName)) {
                // switchToFrame
                await browser.switchTo().frame(webElement);

                return {
                    switchBack: async (): Promise<void> => {
                        await promised(browser.driver.switchToParentFrame());
                    },
                };
            }
            else {
                // focus on element
                const previouslyFocusedElement = await webElement.getDriver().switchTo().activeElement();

                await webElement.getDriver().executeScript(`arguments[0].focus()`, webElement);

                return {
                    switchBack: async (): Promise<void> => {
                        await promised(webElement.getDriver().executeScript(`arguments[0].focus()`, previouslyFocusedElement));
                    },
                };
            }
        } catch (error) {
            throw new LogicError(`Couldn't switch to page element located ${ this.locator }`, error);
        }
    }

    async isActive(): Promise<boolean> {
        const element: ElementFinder = await this.nativeElement();
        const webElement: WebElement = await element.getWebElement();

        return promised(webElement.getDriver().switchTo().activeElement().then((active: WebElement) =>
            element.equals(active),
        ));
    }

    async isClickable(): Promise<boolean> {
        return this.isEnabled();
    }

    async isEnabled(): Promise<boolean> {
        const element: ElementFinder = await this.nativeElement();

        return promised(element.isEnabled());
    }

    async isPresent(): Promise<boolean> {
        const element: ElementFinder = await this.nativeElement();

        return promised(element.isPresent());
    }

    async isSelected(): Promise<boolean> {
        const element: ElementFinder = await this.nativeElement();

        return promised(element.isSelected());
    }

    /**
     * @desc
     *  Checks if the PageElement:
     *  - is not hidden, so doesn't have CSS style like `display: none`, `visibility: hidden` or `opacity: 0`
     *  - is within the browser viewport
     *  - doesn't have its centre covered by other elements
     *
     * @returns {Promise<boolean>}
     *
     * @see {@link @serenity-js/web/lib/screenplay/models~PageElement}
     */
    async isVisible(): Promise<boolean> {
        try {
            const element: ElementFinder = await this.nativeElement();

            if (! await element.isDisplayed()) {
                return false;
            }

            const webElement: WebElement = await element.getWebElement();

            // get element at cx/cy and see if the element we found is our element, and therefore it's visible.
            return promised(webElement.getDriver().executeScript(
                scripts.isVisible,
                webElement,
            ));
        }
        catch (error) {

            if (error.name === 'NoSuchElementError') {
                return false;
            }

            throw error;
        }
    }
}
