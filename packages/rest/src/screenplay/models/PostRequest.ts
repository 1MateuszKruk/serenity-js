import type { Answerable, WithAnswerableProperties } from '@serenity-js/core';
import { Question } from '@serenity-js/core';
import type { AxiosRequestConfig } from 'axios';

import { HTTPRequest } from './HTTPRequest';

/**
 * The HTTP POST method requests that the origin server accepts
 * the entity enclosed in the request as a new subordinate of the resource
 * identified by the `resourceUri`.
 *
 * This means that the POST should be used when you want to create a child resource under
 * a collection of resources.
 *
 * POST request is neither [safe](https://developer.mozilla.org/en-US/docs/Glossary/Safe),
 * nor [idempotent](https://developer.mozilla.org/en-US/docs/Glossary/Idempotent).
 * This means that if you retry a POST request N times,
 * a correctly implemented HTTP REST API will create N resources with N different URIs.
 *
 * ## Add new resource to a collection
 *
 * ```ts
 * import { actorCalled } from '@serenity-js/core'
 * import { CallAnApi, LastResponse, PostRequest, Send } from '@serenity-js/rest'
 * import { Ensure, equals } from '@serenity-js/assertions'
 *
 * await actorCalled('Apisitt')
 *   .whoCan(CallAnApi.at('https://api.example.org/'))
 *   .attemptsTo(
 *     Send.a(PostRequest.to('/books').with({
 *       isbn: '0-688-00230-7',
 *       title: 'Zen and the Art of Motorcycle Maintenance: An Inquiry into Values',
 *       author: 'Robert M. Pirsig',
 *     })),
 *     Ensure.that(LastResponse.status(), equals(201)),
 *     Ensure.that(LastResponse.header('Location'), equals('/books/0-688-00230-7')),
 *   )
 * ```
 *
 * ## Submit an HTML form
 *
 * ```ts
 * import { actorCalled } from '@serenity-js/core'
 * import { CallAnApi, LastResponse, PostRequest, Send } from '@serenity-js/rest'
 * import { Ensure, equals } from '@serenity-js/assertions'
 * import { stringify } from 'querystring'
 *
 * const formData = stringify({
 *     name: actor.name,
 *     email: `${ actor.name }@example.com`,
 *     text: 'Your website is great! Learnt a lot :-)'
 * });
 *
 * await actorCalled('Apisitt')
 *   .whoCan(CallAnApi.at('https://api.example.org/'))
 *   .attemptsTo(
 *     Send.a(PostRequest.to('/feedback').with(postData).using({
 *       headers: {
 *         'Content-Type': 'application/x-www-form-urlencoded',
 *         'Content-Length': formData.length
 *       }
 *     })),
 *     Ensure.that(LastResponse.status(), equals(200)),
 *     Ensure.that(LastResponse.header('Location'), equals('/feedback/thank-you.html')),
 *   )
 * ```
 *
 * ## Learn more
 * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST
 * - https://tools.ietf.org/html/rfc7231#section-4.3.3
 *
 * @group Models
 */
export class PostRequest extends HTTPRequest {

    /**
     * Configures the object with a destination URI.
     *
     * When the `resourceUri` is not a fully qualified URL but a path, such as `/products/2`,
     * it gets concatenated with the URL provided to the Axios instance
     * when the {@apilink Ability|ability} to {@apilink CallAnApi} was instantiated.
     *
     * @param resourceUri
     *  The URI where the {@apilink Actor}
     *  should send the {@apilink HTTPRequest}
     */
    static to(resourceUri: Answerable<string>): PostRequest {
        return new PostRequest(resourceUri);
    }

    /**
     * Configures the object with a request body.
     *
     * @param data
     *  Data to be sent to the `resourceUri`
     */
    with(data: Answerable<any>): PostRequest {
        return new PostRequest(this.resourceUri, data, this.config);
    }

    /**
     * Overrides the default Axios request configuration provided
     * when the {@apilink Ability|ability} to {@apilink CallAnApi} was instantiated.
     *
     * #### Learn more
     * - {@apilink Answerable}
     * - {@apilink WithAnswerableProperties}
     * - [AxiosRequestConfig](https://axios-http.com/docs/req_config)
     *
     * @param {Answerable<WithAnswerableProperties<AxiosRequestConfig>>} config
     *  Axios request configuration overrides
     */
    using(config: Answerable<WithAnswerableProperties<AxiosRequestConfig>>): PostRequest {
        return new PostRequest(this.resourceUri, this.data, Question.fromObject(config));
    }
}
