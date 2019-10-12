import {readFileSync} from "fs";
import {PDA, Transition} from "./pda";

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

const util = require('util');

const contents = readFileSync(process.argv[2], {encoding: "utf8"});
const pda = constructPDA(contents);
console.log(util.inspect(pda, {showHidden: false, depth: null, colors: true}));


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
      console.log(value.join(""));
    }
  }

  console.log("timeout");
}

fuzzTest(pda, 150);
