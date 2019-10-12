interface Transition<S, A, T> {
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

class PDA<S, A, T> {
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

function getNext(input: string, defaultState: number): {state: number, stack: string[]} | undefined {
  if (!input) {
    return undefined;
  }
  const val = input.split("/");
  return {
    state: parseInt(val[0]) || defaultState,
    stack: val[1].split("").reverse(),
  }
}

function makeTransitions(table: any[][]): Set<Transition<number, string, string>> {
  for (const row of table) {
    if (row.length !== table[0].length) {
      throw new Error("Dimension error");
    }
  }

  const transitions = new Set<Transition<number, string, string>>();
  const state: number = table[0][0];
  const stackVals = table[0];

  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    const character = row[0] || undefined;
    for (let j = 1; j < row.length; j++) {
      const entry = row[j];
      const stack = stackVals[j];

      const next = getNext(entry, state);
      if (next === undefined) {
        continue;
      };

      transitions.add({state, input: character, stack, next});
    }
  }

  return transitions;
}

function constructPDA(input: string): PDA<number, string, string> {
  const transitions = new Set<Transition<number, string, string>>();
  const finalStates = new Set<number>();
  const initialStack = "Z";

  const tables: any[][][] = input.split(/\s*\n{2,}\s*/)
    .map(c => c.trim().split(/\s*\n\s*/)
      .map(l => l.split(/\s*,\s*/)
        .map(e => e || undefined)));

  for (const table of tables) {
    let state: string = table[0][0];
    let final = false;
    if (state[0] === "*") {
      final = true;
      state = state.slice(1);
    }

    table[0][0] = parseInt(state);
    if (final) {
      finalStates.add(table[0][0]);
    }
    makeTransitions(table).forEach(t => transitions.add(t));
  }

  const initialState = tables[0][0][0];

  console.log(tables);

  return new PDA<number, string, string>(initialState, finalStates, transitions, initialStack);
}

function* permutations(alphabet: string[], length: number): IterableIterator<string[]> {
  const word: string[] = [];
  yield word;
  word.push(alphabet[0]);

  const nextMap = new Map<string, string>();
  for (let i = 0; i < alphabet.length; i++) {
    nextMap.set(alphabet[i], alphabet[(i + 1) % alphabet.length]);
  }
  const next = (letter: string): string => nextMap.get(letter)!;

  for (let i = 0; i < length; i++) {
    while (true) {
      yield word;

      let index = 0;
      while (index < word.length) {
        word[index] = next(word[index]);
        if (word[index] === alphabet[0]) {
          index += 1;
        } else {
          break;
        }
      }

      if (index === word.length) {
        break;
      }
    }

    word.push(alphabet[0]);
  }
}

async function fuzzTest(pda: PDA<number, string, string>, wordLength: number) {
  let start = Date.now();
  const alphabet = pda.getAlphabet();
  console.log(alphabet);

  const perms = permutations(alphabet, wordLength);

  while (Date.now() - start < 2000) {
    const input = perms.next();
    if (input.done) {
      return;
    }
    const value = input.value;

    pda.reset(0, ["Z"]);
    if (pda.accepts(value)) {
      const node = document.createElement("li");
      const word = document.createTextNode(value.join(""));
      node.appendChild(word);
      document.getElementById("accepted_output")!.appendChild(node);
    }
  }

  console.log("timeout");
}

console.log("Hmmm")




function processInput() {
  console.log("Doing...");
  document.getElementById("accepted_output")!.innerHTML = "";

  const input = (document.getElementById("pda_tables")! as HTMLTextAreaElement).value;
  try {
    const pda = constructPDA(input);
    fuzzTest(pda, 10);
  } catch (e) {
    console.error(e);
  }
}
