// @ts-ignore
import { Remote } from "https://unpkg.com/@clinth/remote@latest/dist/index.mjs";
import { Points } from '../../../ixfx/geometry.js';
import { Bipolar, interpolate } from '../../../ixfx/data.js';
import { fullSizeCanvas } from '../../../ixfx/dom.js';
import * as MoveNet from "../Poses.js";
import * as Things from './thing.js';
import * as Util from './util.js';

const settings = Object.freeze({
  // How often to compute data from poses & update thing
  updateSpeedMs: 10,
  // How much to push toward 0 neutral position
  distDecay: 0.001,
  // How much of computed distance to fold in
  distanceAmount: 0.01,
  // Empirically-discovered min angle
  distMin: 0,
  // Empirically-discovered max angle
  distMax: 0.8,
  remote: new Remote(),
  poses: new MoveNet.PosesTracker({maxAgeMs: 500 }),
});

/** 
 * @typedef {{
 *  dist:number
 *  thing: Things.Thing
 *  bounds: import('./util.js').Bounds
 * }} State
 */

/**
 * @type {State}
 */
let state = Object.freeze({
  thing: Things.create(),
  bounds: {
    width: 0, height: 0,
    min:0, max: 0,
    center: { x: 0, y: 0 },
  },
  // Bipolar value: -1...1
  dist:0
});

/**
 * Makes use of the data contained in `state`
 */
const use = () => {
  const { bounds, thing } = state;
  const context = Util.getDrawingContext();

  context.fillStyle = `hsl(220, 100%, 90%)`;
  context.fillRect(0,0,bounds.width,bounds.height);
  
  Things.use(thing, context, bounds);
};

const update = () => {
  const { poses } = settings;
  
  // Calculate change in dist
  let distanceTotal = 0;
  const posesArray = [...poses.getRawPoses()]
  for (let i = 0; i < posesArray.length; i++) {
    let d = computeWristDistance(posesArray[i]); 

    
    // Skip cases where we can't compute angle (eg missing keypoints)
    if (Number.isNaN(d)) continue;
    
    if(i % 2 == 0){ 
      d = -d;
    }
    
    
    distanceTotal += d; // distanceTotal = distanceTotal + d;
    
  }
  
  // Save
  saveState({ dist: distanceTotal });

};

/**
 * Return distance between left and right wrist
 * @param {MoveNet.Pose} pose 
 */
const computeWristDistance = (pose) => {
  const left = MoveNet.Coco.getKeypoint(pose, `left_wrist`);
  const right = MoveNet.Coco.getKeypoint(pose, `right_wrist`);
  const distance = Points.distance(left, right);
  return distance;
};

/**
 * Called when a new pose is detected
 * @param {*} event 
 */
const onPoseAdded = (event) => {
  const poseTracker = /** @type MoveNet.PoseTracker */(event.detail);
  console.log(`Pose added: ${poseTracker.guid}`);
};

/**
 * Called when a pose is no longer being tracked
 * @param {*} event 
 */
const onPoseExpired = (event) => {
  const poseTracker = /** @type MoveNet.PoseTracker */(event.detail);
  console.log(`Pose expired: ${poseTracker.guid}`);
};


function setup() {
  const { remote, poses } = settings;
  remote.onData = onReceivedPoses;
  poses.events.addEventListener(`added`, onPoseAdded);
  poses.events.addEventListener(`expired`, onPoseExpired);

  // Automatically size canvas to viewport
  fullSizeCanvas(`#canvas`, onResized => {
    saveState({ bounds: onResized.bounds });
  });

  // Update
  setInterval(() => {
    // Update main state
    update();
    // Update thing
    saveState({ 
      thing: Things.update(state.thing, state)
    });
  }, settings.updateSpeedMs);

  // Draw loop
  const animationLoop = () => {
    use();
    window.requestAnimationFrame(animationLoop);
  };
  window.requestAnimationFrame(animationLoop);

};

setup();

/**
 * Called when we receive data
 * @param {*} packet 
 */
function onReceivedPoses (packet) {
  const { _from, data } = packet;
  const poseData =/** @type MoveNet.Pose[] */(data);
  
  // Pass each pose over to the poses tracker
  for (const pose of poseData) {
    if ([...settings.poses.getRawPoses()].length >= 2) break;
    settings.poses.seen(_from, pose);
  }
};

/**
 * Update state
 * @param {Partial<State>} s 
 */
function saveState (s) {
  state = Object.freeze({
    ...state,
    ...s
  });
}

