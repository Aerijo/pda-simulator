const EPSILON = "&epsilon;";

interface Transition {
  readonly state: string;
  readonly input: string;
  readonly stack: string;
  readonly next: Step;
}

interface Step {
  state: string,
  stack: string[],
}

interface TTableProto {
  state: string,
  final: boolean,
  contents: string[][]
}

class TransitionTable {
  epsilonTransitions: Map<string, Step>;
  fullTransitions: Map<string, Map<string, Step>>;

  constructor(transitions: Transition[]) {
    this.epsilonTransitions = new Map<string, Step>();
    this.fullTransitions = new Map<string, Map<string, Step>>();

    for (const t of transitions) {
      if (t.input === "ε") {
        this.epsilonTransitions.set(t.stack, t.next);
      } else {
        if (!this.fullTransitions.has(t.stack)) {
          this.fullTransitions.set(t.stack, new Map());
        }
        const inputMap = this.fullTransitions.get(t.stack)!;
        inputMap.set(t.input, t.next);
      }
    }

    for (const [key,] of this.epsilonTransitions) {
      if (this.fullTransitions.has(key)) {
        throw new Error("Non-deterministic");
      }
    }
  }

  getEpsilonNext(stack: string): Step | undefined {
    return this.epsilonTransitions.get(stack);
  }

  getInputNext(input: string, stack: string): Step | undefined {
    const inputMap = this.fullTransitions.get(stack);
    return inputMap ? inputMap.get(input) : undefined;
  }
}

class Pda {
  readonly alphabet: Set<string>;
  readonly states: Set<string>;
  readonly finalStates: Set<string>;
  readonly initialState: string;
  readonly initialStack: string[]
  readonly transitions: Map<string, TransitionTable>;

  state: string;
  stack: string[];

  constructor(alphabet: Set<string>, states: Set<string>, initialState: string, finalStates: Set<string>, transitions: Map<string, TransitionTable>, initialStack: string[]) {
    this.alphabet = alphabet;
    this.states = states;
    this.finalStates = finalStates;
    this.initialState = initialState;
    this.initialStack = initialStack;
    this.transitions = transitions;

    this.state = this.initialState;
    this.stack = [...this.initialStack];
  }

  applyStep(step: Step | undefined): boolean {
    if (step === undefined) {
      return false;
    }
    const {state, stack} = step;
    this.state = state;
    this.stack.push(...stack);
    return true;
  }

  doEpsilonTransitions() {
    while (this.stack.length > 0) {
      const table = this.transitions.get(this.state)!;
      const stackVal = this.stack.pop()!;
      if (!this.applyStep(table.getEpsilonNext(stackVal))) {
        this.stack.push(stackVal);
        return;
      }
    }
  }

  doStepEpsilonTransitions(remaining: string) {
    while (this.stack.length > 0) {
      const table = this.transitions.get(this.state)!;
      const stackVal = this.stack.pop()!;
      if (!this.applyStep(table.getEpsilonNext(stackVal))) {
        this.stack.push(stackVal);
        return;
      }
      this.appendState(remaining, "ε");
    }
  }

  accepts(input: string): boolean {
    for (const char of input) {
      if (!this.alphabet.has(char)) {
        throw new Error(`Unexpected letter ${char}`);
      }
    }

    for (const char of input) {
      this.doEpsilonTransitions();
      if (this.stack.length === 0) { return false; }

      const table = this.transitions.get(this.state)!;
      const stackVal = this.stack.pop()!;
      if (!this.applyStep(table.getInputNext(char, stackVal))) {
        return false;
      }
    }

    this.doEpsilonTransitions();
    return this.isInFinalState();
  }

  stepThrough(input: string) {
    for (const char of input) {
      if (!this.alphabet.has(char)) {
        throw new Error(`Unexpected letter ${char}`);
      }
    }

    this.appendState(input, "initial");

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const remaining = input.slice(i);
      this.doStepEpsilonTransitions(remaining);
      if (this.stack.length === 0) {
        this.appendState(remaining, "reject");
        return false;
      }

      const table = this.transitions.get(this.state)!;
      const stackVal = this.stack.pop()!;
      if (!this.applyStep(table.getInputNext(char, stackVal))) {
        this.appendState(remaining, "reject");
        return false;
      }
      this.appendState(remaining.slice(1), `->${char}`);
    }

    this.doStepEpsilonTransitions("");

    this.appendState("", this.isInFinalState() ? "accept" : "reject");
  }

  appendState(remainingInput: string, kind: string) {
    // const value = `${this.state}, [${remainingInput.split("")}], [${[...this.stack]}] (${kind})`;

    const state = document.createElement("td");
    state.textContent = this.state;
    const input = document.createElement("td");
    input.textContent = remainingInput;
    const stack = document.createElement("td");
    stack.textContent = `[${this.stack}]`;
    const post = document.createElement("td");
    post.textContent = `(${kind})`;

    const node = document.createElement("tr");
    node.appendChild(state);
    node.appendChild(input);
    node.appendChild(stack);
    node.appendChild(post);
    document.getElementById("pda_state")!.appendChild(node);
  }

  isInFinalState() {
    return this.finalStates.has(this.state);
  }

  reset() {
    this.state = this.initialState;
    this.stack = [...this.initialStack];
  }

  getAlphabet(): string[] {
    return Array.from(this.alphabet);
  }
}

function getNext(input: string, defaultState: string): {state: string, stack: string[]} {
  if (!/\w*\/\w*/.test(input)) {
    throw new Error(`Unexpected cell value ${input}`);
  }

  const val = input.split("/");
  return {
    state: val[0] || defaultState,
    stack: val[1].split("").reverse(),
  }
}

function getState(input: string): {state: string, final: boolean} | undefined {
  const match = /^(\*)?(\w+)$/.exec(input);
  if (match === null) {
    return undefined;
  }
  return {state: match[2], final: !!match[1]};
}

function processHtmlTable(table: HTMLTableElement): TTableProto {
  const {state, final} = getState(table.rows[0].cells[0].textContent!)!;
  const contents: string[][] = [];
  for (const htmlRow of table.rows) {
    const row: string[] = [];
    for (const cell of htmlRow.cells) {
      row.push(cell.textContent || "");
    }
    contents.push(row);
  }
  return {state, final, contents};
}

function getTransitions(def: TTableProto, states: Set<string>, stackSyms: Set<string>): Transition[] {
  const state = def.state;
  const stackHeader = def.contents[0];
  const transitions: Transition[] = [];
  for (let i = 1; i < def.contents.length; i++) {
    const row = def.contents[i];
    const letter = row[0];
    for (let j = 1; j < row.length; j++) {
      const cell = row[j];
      if (!cell) { continue; }
      const {state: nState, stack: nStack} = getNext(cell, state);
      if (!states.has(state)) {
        throw new Error(`Undefined state ${nState}`);
      }
      if (nStack.some(s => !stackSyms.has(s))) {
        throw new Error(`Undefined stack symbol in ${nStack}`);
      }
      transitions.push({state, input: letter, stack: stackHeader[j], next: {state: nState, stack: nStack}});
    }
  }
  return transitions;
}

function buildPda(): Pda | undefined {
  const tables = document.getElementById("transition_tables")!.firstChild;
  if (!tables || !tables.hasChildNodes) {
    return;
  }

  const protoTables: TTableProto[] = [];
  tables.childNodes.forEach(child => {
    const table = child as HTMLTableElement;
    protoTables.push(processHtmlTable(table));
  });

  const alphabet = new Set(protoTables[0].contents.slice(1, -1).map(r => r[0]));
  const states = new Set(protoTables.map(t => t.state));
  const finalStates = new Set(protoTables.filter(t => t.final).map(t => t.state));
  const initialState = protoTables[0].state;
  const stackSymbols = new Set(protoTables[0].contents[0].slice(1));
  const initialStack = ["Z"];
  const transitions = new Map<string, TransitionTable>(protoTables.map(t => [t.state, new TransitionTable(getTransitions(t, states, stackSymbols))] as any));

  const pda = new Pda(alphabet, states, initialState, finalStates, transitions, initialStack);

  return pda;
}

function processInput() {
  document.getElementById("accepted_output")!.innerHTML = "";
  const pda = buildPda();
  if (!pda) { return; }
  fuzzTest(pda, 100);
}

function getInput(name: string): HTMLInputElement {
  return document.getElementById(name)! as HTMLInputElement;
}

function populatePdaAttributes(states: string, alphabet: string, stackSymbols: string) {
  getInput("pda_states").value = states;
  getInput("pda_alphabet").value = alphabet;
  getInput("pda_stack_symbols").value = stackSymbols;
  generateTransitionTables();
}

function populateBinaryPda() {
  populatePdaAttributes("S0, *S1", "0, 1", "0, 1");
}

function populateAbcPda() {
  populatePdaAttributes("S0, S1, *S2", "a, b, c", "a, b, c");
}

function setCell(state: string, row: number, column: number, value: string) {
  const table = document.getElementById(`transition_table_${state}`)! as HTMLTableElement;
  table.rows[row].cells[column].textContent = value;
}

function populateTest() {
  populateAbcPda();
  setCell("S0", 1, 1, "/aZ");
  setCell("S0", 1, 2, "/aa");
  setCell("S0", 2, 2, "S1/");
  setCell("S1", 2, 2, "/");
  setCell("S1", 4, 1, "S2/");
}

function getStates(): {states: string[], finalStates: Set<string>} {
  const entries = getInput("pda_states").value.split(/\s*,\s*|\s+/);

  const states: string[] = [];
  const finalStates = new Set<string>();

  for (let entry of entries) {
    if (entry.startsWith("*")) {
      entry = entry.slice(1);
      finalStates.add(entry);
    }

    if (!/^\w+/.test(entry)) {
      throw new Error(`Invalid state name ${entry}`);
    }
    states.push(entry);
  }

  return {states, finalStates};
}

function getStackSymbols(): string[] {
  const syms = getInput("pda_stack_symbols").value.split(/\s*,\s*|\s+/);

  for (const s of syms) {
    if (s === "Z") {
      throw new Error("Initial stack symbol not allowed");
    }

    if (!/^\w$/.test(s)) {
      throw new Error(`Invalid symbol name ${s}`);
    }
  }

  return ["Z", ...syms];
}

function getAlphabet(): string[] {
  const alphabet = getInput("pda_alphabet").value.split(/\s*,\s*|\s+/);
  for (const a of alphabet) {
    if (!/^\w$/.test(a)) {
      throw new Error(`Invalid letter ${a}`);
    }
  }
  return [...alphabet, EPSILON];
}

function generateTransitionTables() {
  const location = document.getElementById("transition_tables")!;
  const tables = document.createElement("div");

  const {states, finalStates} = getStates();
  const stackSyms = getStackSymbols();
  const alphabet = getAlphabet();

  for (const state of states) {
    const table = document.createElement("table");
    table.setAttribute("id", `transition_table_${state}`);
    table.setAttribute("class", "transition_table");

    const stackRow = document.createElement("tr");
    const stateEntry = document.createElement("td");
    stateEntry.innerText = `${finalStates.has(state) ? "*" : ""}${state}`;
    stackRow.appendChild(stateEntry);
    for (const sym of stackSyms) {
      const symCell = document.createElement("td");
      symCell.innerText = sym;
      stackRow.appendChild(symCell);
    }
    table.appendChild(stackRow);

    for (const letter of alphabet) {
      const row = document.createElement("tr");
      const letterNode = document.createElement("td");
      letterNode.innerHTML = letter;
      row.appendChild(letterNode)
      for (let i = 0; i < stackSyms.length; i++) {
        const cell = document.createElement("td");
        cell.setAttribute("contentEditable", "true");
        cell.setAttribute("spellcheck", "false");
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    tables.appendChild(table);
  }

  location.innerHTML = "";
  location.appendChild(tables);
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

async function fuzzTest(pda: Pda, wordLength: number) {
  let start = Date.now();
  const alphabet = pda.getAlphabet();

  const perms = permutations(alphabet, wordLength);
  const output = document.getElementById("accepted_output")!;
  while (Date.now() - start < 5000) {
    const input = perms.next();
    if (input.done) {
      return;
    }
    const value = input.value.join("");

    pda.reset();
    if (pda.accepts(value)) {
      const node = document.createElement("li");
      const word = document.createTextNode(value);
      node.appendChild(word);
      output.appendChild(node);
    }
  }

  console.log("timeout");
}


function testInput() {
  const output = document.getElementById("accepted_output")!;
  output.innerHTML = "";

  const table = document.createElement("table");
  table.setAttribute("id", "pda_state");

  table.innerHTML = "<tr><td>State</td><td>Remaining</td><td>Stack</td><td>Kind</td></tr>";

  output.appendChild(table);

  const pda = buildPda();
  if (!pda) { return; }
  const input = (document.getElementById("pda_input")! as HTMLInputElement).value;
  pda.stepThrough(input);
}
