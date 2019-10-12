export interface Transition<S, A, T> {
  readonly state: S;
  readonly input: A | undefined;
  readonly stack: T;
  readonly next: {
    state: S,
    stack: T[],
  }
}

interface Step<S, T> {
  consume: boolean,
  state: S,
  stack: T[],
}

class TransitionTable<S, A, T> {
  next: Map<T, Map<A, Step<S, T>> | Step<S, T>>;

  constructor(transitions: Transition<S, A, T>[]) {
    const fullTransitions = new Map<T, Map<A, Step<S, T>>>();
    const epsilonTransitions = new Map<T, Step<S, T>>();

    for (const t of transitions) {
      if (t.input === undefined) {
        epsilonTransitions.set(t.stack, {consume: false, ...t.next});
      } else {
        if (fullTransitions.get(t.stack) === undefined) {
          fullTransitions.set(t.stack, new Map());
        }
        fullTransitions.get(t.stack)!.set(t.input, {consume: true, ...t.next});
      }
    }

    this.next = fullTransitions;

    for (const [stack, next] of epsilonTransitions) {
      if (this.next.get(stack) !== undefined) {
        throw new Error("Non-deterministic");
      }
      this.next.set(stack, next);
    }
  }

  getNext(input: A | undefined, stack: T): Step<S, T> | undefined {
    const inputDiscrim = this.next.get(stack);
    if (inputDiscrim instanceof Map) {
      return input !== undefined ? inputDiscrim.get(input) : undefined;
    } else {
      return inputDiscrim;
    }
  }
}

export class PDA<S, A, T> {
  state: S;
  finalStates: Set<S>;
  transitions: Map<S, TransitionTable<S, A, T>>;
  stack: T[];

  constructor(initialState: S, finalStates: Set<S>, transitions: Set<Transition<S, A, T>>, initialStack: T) {
    this.state = initialState;
    this.finalStates = finalStates;
    this.transitions = new Map();
    this.stack = [initialStack];

    const states = new Set<S>([initialState, ...finalStates]);
    for (const t of transitions) {
      states.add(t.state);
      states.add(t.next.state);
    }

    const sorter = new Map<S, Transition<S, A, T>[]>();
    for (const state of states) {
      sorter.set(state, []);
    }

    for (const t of transitions) {
      sorter.get(t.state)!.push(t);
    }

    for (const [s, ts] of sorter) {
      this.transitions.set(s, new TransitionTable<S, A, T>(ts));
    }
  }

  accepts(input: A[]): boolean {
    const plugged = [...input, undefined];
    for (let i = 0; i < plugged.length; i++) {
      const a = plugged[i];
      while (true) {
        if (this.stack.length === 0) {
          return false;
        }

        const t = this.stack.pop()!;
        const table = this.transitions.get(this.state)!;

        const next = table.getNext(a, t);
        if (next === undefined) {
          return a === undefined && this.finalStates.has(this.state);
        }
        this.state = next.state;
        this.stack.push(...next.stack);
        if (next.consume) {
          break;
        }

        if (a === undefined) {
          return this.finalStates.has(this.state);
        }
      }
    }
    return false;
  }

  reset(state: S, stack: T[]) {
    this.state = state;
    this.stack = stack;
  }

  getAlphabet(): A[] {
    const alphabet = new Set<A>();
    for (const [,table] of this.transitions) {
      for (const [,letterMap] of table.next) {
        if (letterMap instanceof Map) {
          for (const [letter,] of letterMap) {
            alphabet.add(letter);
          }
        }
      }
    }

    return Array.from(alphabet);
  }
}
