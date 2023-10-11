import * as Things from './thing.js';
import * as Util from './util.js';

// Settings for sketch
const settings = Object.freeze({
  // How often to update the Things
  thingUpdateSpeedMs: 10,
  // How many things to spawn
  spawnThings: 10
});

/** 
 * @typedef {{
 *  things:Things.Thing[]
 * }} State
 */

/**
 * @type {State}
 */
let state = Object.freeze({
  things: []
});

/**
 * Makes use of the data contained in `state`
 */
const use = () => {
  // 1. Use the state some how
};

const update = () => {
  // 1. Any other state updates?
  // 2. Sanity check
  // 3. Save state
  // 4. Use state
  use();

  // 5. Call itself
  window.requestAnimationFrame(update);
};

function setup() {
  // Create things
  const things = [];
  for (let index=1;index<=settings.spawnThings;index++) {
    things.push(Things.create(index));
  }

  // Save them into state
  saveState({ things });

  // Update things at a fixed rate
  setInterval(() => {
    let { things } = state;

    // Update all the things
    things = things.map(t => Things.update(t, state));

    // Save updated things into state
    saveState({ things });

    // Visually update based on new state
    for (const thing of things) {
      Things.use(thing);
    }
  }, settings.thingUpdateSpeedMs);

  // Update state of sketch and use state
  // at full speed
  update();
};

setup();

/**
 * Save state
 * @param {Partial<State>} s 
 */
function saveState (s) {
  state = Object.freeze({
    ...state,
    ...s
  });
}

/**
 * Update a given thing by its id. The
 * updated thing is returned,  or _undefined_
 * if it wasn't found.
 * @param {number} thingId 
 * @param {Partial<Things.Thing>} updatedThing 
 * @returns {Things.Thing|undefined}
 */
function updateThingInState(thingId, updatedThing) {
  let completedThing;

  const things = state.things.map(thing => {
    // Is it the thing we want to change?
    if (thing.id !== thingId) return thing; // nup
    
    // Return mutated thing
    completedThing = {
      ...thing,
      ...updatedThing
    };
    return completedThing;
  });

  // Save changed things
  saveState({things});
  return completedThing;
}