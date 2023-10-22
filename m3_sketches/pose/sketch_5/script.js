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
  tiltDecay: 0.001,
  // How much of computed angle to fold in
  angleAmount: 0.003,
  // Empirically-discovered min angle
  tiltMin: -0.5,
  // Empirically-discovered max angle
  tiltMax: 0.5,
  remote: new Remote(),
  poses: new MoveNet.PosesTracker({maxAgeMs: 2000 }),
});

/** 
 * @typedef {{
 *  area:number
 *  thing: Things.Thing
 *  bounds: import('./util.js').Bounds
 *  value: {
 *    minX: number 
 *    maxX: number
 *    minY: number
 *    maxY: number }
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
  area:0,
  value:{
    minX: 1,
    maxX: 0,
    minY: 1,
    maxY: 0,
  }
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

  const posesArray = [...poses.getRawPoses()];
  let totalArea = 0;

  for (let i = 0; i < posesArray.length; i++) {

    computeWristMovement(posesArray[i]);

    const {minX, minY, maxX, maxY} = state.value;

    let area = findArea(minX, minY, maxX, maxY);
    
    if(i % 2 === 0){
      area = -area;
    }

    totalArea += area;

    console.log(area, i)

    saveState({value: {
      minX: 1,
      maxX: 0,
      minY: 1,
      maxY: 0
    }})
  }

  console.log(totalArea)

  saveState({area: totalArea});
  
};

/**
 * 
 * @param {number} minX 
 * @param {number} minY 
 * @param {number} maxX 
 * @param {number} maxY 
 * @returns {number}
 */
const findArea = (minX, minY, maxX, maxY) => {

  const area = ((minX * maxY + minX * minY) - (minX * maxY + maxX * maxY) - (maxX * minY + maxX * maxY) - (minX * minY + maxX * minY)) / 2

  return area;
}

/**
 * Compares the values and returns the minimum value given as a parameter
 * @param {number} x 
 * @param {number} y 
 * 
 */
const findMinAndMaxValue = (x, y) => {
  const {minX, maxX, minY, maxY} = state.value;
  let maxXTemp = 0, maxYTemp = 0;
  let minXTemp = 1, minYTemp = 1;
  if(minX >= x - 0.05 )
    minXTemp = x;
  if(minY >= y - 0.05)
    minYTemp = y;
  if(maxX <= x + 0.05)
    maxXTemp = x;
  if(maxY <= y + 0.05)
    maxYTemp = y;

  saveState({value: {
    minX: minXTemp,
    maxX: maxXTemp,
    minY: minYTemp,
    maxY: maxYTemp
  }})
}

/**
 * Return angle (in radians) between left and right shoulder
 * @param {MoveNet.Pose} pose 
 */
const computeWristMovement = (pose) => {
  const right = MoveNet.Coco.getKeypoint(pose, `right_wrist`);
  findMinAndMaxValue(right.x, right.y);
}


/**
 * Return angle (in radians) between left and right shoulder
 * @param {MoveNet.Pose} pose 
 */
const computeShoulderAngle = (pose) => {
  const left = MoveNet.Coco.getKeypoint(pose, `left_shoulder`);
  const right = MoveNet.Coco.getKeypoint(pose, `right_shoulder`);
  const angleRadians = Points.angle(left, right);
  return angleRadians;
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

