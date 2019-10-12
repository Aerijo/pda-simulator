"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TransitionTable {
    constructor(transitions) {
        const fullTransitions = new Map();
        const epsilonTransitions = new Map();
        for (const t of transitions) {
            if (t.input === undefined) {
                epsilonTransitions.set(t.stack, { consume: false, ...t.next });
            }
            else {
                if (fullTransitions.get(t.stack) === undefined) {
                    fullTransitions.set(t.stack, new Map());
                }
                fullTransitions.get(t.stack).set(t.input, { consume: true, ...t.next });
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
    getNext(input, stack) {
        const inputDiscrim = this.next.get(stack);
        if (inputDiscrim instanceof Map) {
            return input !== undefined ? inputDiscrim.get(input) : undefined;
        }
        else {
            return inputDiscrim;
        }
    }
}
class PDA {
    constructor(initialState, finalStates, transitions, initialStack) {
        this.state = initialState;
        this.finalStates = finalStates;
        this.transitions = new Map();
        this.stack = [initialStack];
        const states = new Set([initialState, ...finalStates]);
        for (const t of transitions) {
            states.add(t.state);
            states.add(t.next.state);
        }
        const sorter = new Map();
        for (const state of states) {
            sorter.set(state, []);
        }
        for (const t of transitions) {
            sorter.get(t.state).push(t);
        }
        for (const [s, ts] of sorter) {
            this.transitions.set(s, new TransitionTable(ts));
        }
    }
    accepts(input) {
        const plugged = [...input, undefined];
        for (let i = 0; i < plugged.length; i++) {
            const a = plugged[i];
            while (true) {
                if (this.stack.length === 0) {
                    return false;
                }
                const t = this.stack.pop();
                const table = this.transitions.get(this.state);
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
    reset(state, stack) {
        this.state = state;
        this.stack = stack;
    }
    getAlphabet() {
        const alphabet = new Set();
        for (const [, table] of this.transitions) {
            for (const [, letterMap] of table.next) {
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
exports.PDA = PDA;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3BkYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWdCQSxNQUFNLGVBQWU7SUFHbkIsWUFBWSxXQUFrQztRQUM1QyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztRQUN6RCxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1FBRXBELEtBQUssTUFBTSxDQUFDLElBQUksV0FBVyxFQUFFO1lBQzNCLElBQUksQ0FBQyxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUU7Z0JBQ3pCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDO2FBQzlEO2lCQUFNO2dCQUNMLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssU0FBUyxFQUFFO29CQUM5QyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO2lCQUN6QztnQkFDRCxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQzthQUN4RTtTQUNGO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUM7UUFFNUIsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLGtCQUFrQixFQUFFO1lBQzlDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssU0FBUyxFQUFFO2dCQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLG1C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