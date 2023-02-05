import { match } from 'tiny-types';

import { AssertionError, ConfigurationError, ImplementationPendingError, TestCompromisedError } from '../errors';
import { ActivityRelatedArtifactGenerated, InteractionFinished, InteractionStarts, TaskFinished, TaskStarts } from '../events';
import { typeOf } from '../io';
import {
    ActivityDetails,
    Artifact,
    ExecutionCompromised,
    ExecutionFailedWithAssertionError,
    ExecutionFailedWithError,
    ExecutionSuccessful,
    ImplementationPending,
    Name,
    ProblemIndication,
} from '../model';
import { Ability, AbilityType, Answerable, Discardable, Initialisable, Interaction } from '../screenplay';
import { Stage } from '../stage';
import { CanHaveAbilities, UsesAbilities } from './abilities';
import { PerformsActivities } from './activities';
import { Activity } from './Activity';
import { CollectsArtifacts } from './artifacts';
import { Question } from './Question';
import { AnswersQuestions } from './questions';

/**
 * Core element of the Screenplay Pattern,
 * an {@apilink Actor} represents a user or an external system interacting with the system under test.
 *
 * ## Learn more
 *
 * - {@apilink Cast}
 * - {@apilink Stage}
 *
 * @group Actors
 */
export class Actor implements
    PerformsActivities,
    UsesAbilities,
    CanHaveAbilities<Actor>,
    AnswersQuestions,
    CollectsArtifacts
{
    constructor(
        public readonly name: string,
        private readonly stage: Stage,
        private readonly abilities: Map<AbilityType<Ability>, Ability> = new Map<AbilityType<Ability>, Ability>(),
    ) {
    }

    /**
     * Retrieves actor's {@apilink Ability} of `abilityType`, or one that extends `abilityType`.
     *
     * Please note that this method performs an {@apilink instanceof} check against abilities
     * given to this actor via {@apilink Actor.whoCan}.
     *
     * Please also note that {@apilink Actor.whoCan} performs the same check when abilities are assigned to the actor
     * to ensure the actor has at most one instance of a given ability type.
     *
     * @param abilityType
     */
    abilityTo<T extends Ability>(abilityType: AbilityType<T>): T {
        const found = this.findAbilityTo(abilityType);

        if (! found) {
            if (this.abilities.size > 0) {
                throw new ConfigurationError(
                    `${ this.name } can ${ Array.from(this.abilities.keys()).map(type => type.name).join(', ') }. ` +
                    `They can't, however, ${ abilityType.name } yet. ` +
                    `Did you give them the ability to do so?`
                );
            }

            throw new ConfigurationError(
                `${ this.name } can't ${ abilityType.name } yet. ` +
                `Did you give them the ability to do so?`
            );
        }

        return found;
    }

    /**
     * Instructs the actor to attempt to perform a number of {@apilink Activity|activities},
     * so either {@apilink Task|Tasks} or {@apilink Interaction|Interactions}),
     * one by one.
     *
     * @param {...activities: Activity[]} activities
     */
    attemptsTo(...activities: Activity[]): Promise<void> {
        return activities
            .map(activity => new TrackedActivity(activity, this.stage))
            .reduce((previous: Promise<void>, current: Activity) => {
                return previous
                    // synchronise async operations like taking screenshots
                    .then(() => this.stage.waitForNextCue())
                    .then(() =>{
                        /* todo: add an execution strategy */
                        return current.performAs(this);
                    });
            }, this.initialiseAbilities());
    }

    /**
     * Gives this Actor a list of {@apilink Ability|abilities} they can use
     * to interact with the system under test or the test environment.
     *
     * @param abilities
     *  A vararg list of abilities to give the actor
     *
     * @returns
     *  The actor with newly gained abilities
     *
     * @throws {@apilink ConfigurationError}
     *  Throws a ConfigurationError if the actor already has an ability of this type.
     */
    whoCan(...abilities: Ability[]): Actor {
        abilities.forEach(ability => this.acquireAbility(ability));

        return this;
    }

    /**
     * @param answerable -
     *  An {@apilink Answerable} to answer (resolve the value of).
     *
     * @returns
     *  The answer to the Answerable
     */
    answer<T>(answerable: Answerable<T>): Promise<T> {
        function isAPromise<V>(v: Answerable<V>): v is Promise<V> {
            return Object.prototype.hasOwnProperty.call(v, 'then');
        }

        function isDefined<V>(v: Answerable<V>) {
            return ! (v === undefined || v === null);
        }

        if (isDefined(answerable) && isAPromise(answerable)) {
            return answerable;
        }

        if (isDefined(answerable) && Question.isAQuestion(answerable)) {
            return this.answer(answerable.answeredBy(this));
        }

        return Promise.resolve(answerable as T);
    }

    /**
     * Announce collection of an {@apilink Artifact} so that it can be picked up by a {@apilink StageCrewMember}.
     *
     * @param artifact
     * @param name
     */
    collect(artifact: Artifact, name?: string | Name): void {
        this.stage.announce(new ActivityRelatedArtifactGenerated(
            this.stage.currentSceneId(),
            this.stage.currentActivityId(),
            this.nameFrom(name || new Name(artifact.constructor.name)),
            artifact,
            this.stage.currentTime(),
        ));
    }

    /**
     * Instructs the actor to invoke {@apilink Discardable.discard} method on any
     * {@apilink Discardable} {@apilink Ability} it's been configured with.
     */
    dismiss(): Promise<void> {
        return this.findAbilitiesOfType<Discardable>('discard')
            .reduce(
                (previous: Promise<void>, ability: (Discardable & Ability)) =>
                    previous.then(() => ability.discard()),
                Promise.resolve(void 0),
            ) as Promise<void>;
    }

    /**
     * Returns a human-readable, string representation of this actor and their abilities.
     *
     * **PRO TIP:** To get the name of the actor, use {@apilink Actor.name}
     */
    toString(): string {
        const abilities = Array.from(this.abilities.values()).map(ability => ability.constructor.name);

        return `Actor(name=${ this.name }, abilities=[${ abilities.join(', ') }])`;
    }

    private initialiseAbilities(): Promise<void> {
        return this.findAbilitiesOfType<Initialisable>('initialise', 'isInitialised')
            .filter(ability => ! ability.isInitialised())
            .reduce(
                (previous: Promise<void>, ability: (Initialisable & Ability)) =>
                    previous
                        .then(() => ability.initialise())
                        .catch(error => {
                            throw new TestCompromisedError(`${ this.name } couldn't initialise the ability to ${ ability.constructor.name }`, error);
                        }),
                Promise.resolve(void 0),
            )
    }

    private findAbilitiesOfType<T>(...methodNames: Array<keyof T>): Array<Ability & T> {
        const abilitiesFrom = (map: Map<AbilityType<Ability>, Ability>): Ability[] =>
            Array.from(map.values());

        const abilitiesWithDesiredMethods = (ability: Ability & T): boolean =>
            methodNames.every(methodName => typeof(ability[methodName]) === 'function');

        return abilitiesFrom(this.abilities)
            .filter(abilitiesWithDesiredMethods) as Array<Ability & T>;
    }

    private findAbilityTo<T extends Ability>(doSomething: AbilityType<T>): T | undefined {
        const abilityType = this.mostGenericTypeOf(doSomething);

        return this.abilities.get(abilityType) as T;
    }

    private acquireAbility(ability: Ability): void {
        if (! (ability instanceof Ability)) {
            throw new ConfigurationError(`Custom abilities must extend Ability from '@serenity-js/core'. Received ${ typeOf(ability) }`);
        }

        const abilityType = this.mostGenericTypeOf(ability.constructor as AbilityType<Ability>);

        this.abilities.set(abilityType, ability);
    }

    private mostGenericTypeOf<Generic_Ability extends Ability, Specific_Ability extends Generic_Ability>(
        abilityType: AbilityType<Specific_Ability>
    ): AbilityType<Generic_Ability> {
        const parentType = Object.getPrototypeOf(abilityType);
        return ! parentType || parentType === Ability
            ? abilityType
            : this.mostGenericTypeOf(parentType)
    }

    /**
     * Instantiates a {@apilink Name} based on the string value of the parameter,
     * or returns the argument if it's already an instance of {@apilink Name}.
     *
     * @param maybeName
     */
    private nameFrom(maybeName: string | Name): Name {
        return typeof maybeName === 'string'
            ? new Name(maybeName)
            : maybeName;
    }
}

class ActivityDescriber {

    describe(activity: Activity, actor: { name: string }): Name {
        const template = activity.toString() === ({}).toString()
            ? `#actor performs ${ activity.constructor.name }`
            : activity.toString();

        return new Name(
            this.includeActorName(template, actor),
        );
    }

    private includeActorName(template: string, actor: { name: string }) {
        return template.replace('#actor', actor.name);
    }
}

class OutcomeMatcher {
    outcomeFor(error: Error | any): ProblemIndication {
        return match<Error, ProblemIndication>(error)
            .when(ImplementationPendingError, _ => new ImplementationPending(error))
            .when(TestCompromisedError, _ => new ExecutionCompromised(error))
            .when(AssertionError, _ => new ExecutionFailedWithAssertionError(error))
            .when(Error, _ =>
                /AssertionError/.test(error.constructor.name) // mocha
                    ? new ExecutionFailedWithAssertionError(error)
                    : new ExecutionFailedWithError(error))
            .else(_ => new ExecutionFailedWithError(error));
    }
}

class TrackedActivity extends Activity {

    protected static readonly describer = new ActivityDescriber();
    protected static readonly outcomes = new OutcomeMatcher();

    constructor(
        protected readonly activity: Activity,
        protected readonly stage: Stage,
    ) {
        super(activity.toString(), activity.instantiationLocation());
    }

    performAs(actor: (PerformsActivities | UsesAbilities | AnswersQuestions) & { name: string }): Promise<void> {
        const sceneId = this.stage.currentSceneId();
        const details = new ActivityDetails(
            TrackedActivity.describer.describe(this.activity, actor),
            this.activity.instantiationLocation(),
        );
        const activityId = this.stage.assignNewActivityId(details);

        const [ activityStarts, activityFinished] = this.activity instanceof Interaction
            ? [ InteractionStarts, InteractionFinished ]
            : [ TaskStarts, TaskFinished ];

        return Promise.resolve()
            .then(() => this.stage.announce(new activityStarts(sceneId, activityId, details, this.stage.currentTime())))
            .then(() => this.activity.performAs(actor))
            .then(() => {
                const outcome = new ExecutionSuccessful();
                this.stage.announce(new activityFinished(sceneId, activityId, details, outcome, this.stage.currentTime()));
            })
            .catch(error => {
                const outcome = TrackedActivity.outcomes.outcomeFor(error);
                this.stage.announce(new activityFinished(sceneId, activityId, details, outcome, this.stage.currentTime()));

                throw error;
            });
    }
}
