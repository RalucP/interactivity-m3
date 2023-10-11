// @ts-ignore
import { Remote } from "https://unpkg.com/@clinth/remote@latest/dist/index.mjs";
import * as Dom from '../../../ixfx/dom.js';
import { Points } from '../../../ixfx/geometry.js';
import * as MoveNet from "../Poses.js";

const settings = Object.freeze({
  // How quickly to call update()
  updateRateMs: 100,
  remote: new Remote(),
  poses: new MoveNet.PosesTracker({maxAgeMs: 500 }),
  canvasEl: /** @type HTMLCanvasElement */(document.querySelector(`#canvas`)),
});

/**
 * @typedef {{
 * x: number
 * y: number
 * heart: number
 * poseId: string
 * }} Distance
 */

/**
 * @typedef {Readonly<{
 * bounds: { width: number, height: number, center: Points.Point }
 * scaleBy: number
 * distances: Array<Distance>
 * leftWrist: MoveNet.Keypoint
 * rightWrist: MoveNet.Keypoint
 * centroid: Points.Point
 * }>} State
 */

/** @type State */
let state = Object.freeze({
  bounds: {
    width: 0, height: 0,
    center: { x: 0, y: 0 },
  },
  scaleBy: 1,
  distances:[],
  centroid: { x: 0, y: 0},
  leftWrist: { x: 0, y: 0},
  rightWrist: { x: 0, y: 0},
});

/**
 * Runs periodically, computing something
 * new from latest pose data
 */
const update = () => {
  const {poses} = settings;

  // Compute a head size for each pose
  const distances = [];
  for (const pose of poses.getRawPoses()) {
    const distance = computeDistanceBetweenWrists(pose);
    distances.push(distance);
  }

  saveState({distances});
};

/**
 * Returns a circle based on a few head keypoints
 * @param {MoveNet.Pose} pose
 * @return {Distance} 
 */
const computeDistanceBetweenWrists = (pose) => {
  const leftShoulder = MoveNet.Coco.getKeypoint(pose, `left_shoulder`);
  const rightShoulder = MoveNet.Coco.getKeypoint(pose, `right_shoulder`);
  const leftWrist = MoveNet.Coco.getKeypoint(pose, `left_wrist`);
  const rightWrist = MoveNet.Coco.getKeypoint(pose, `right_wrist`);
  const centroid = Points.centroid(leftShoulder, rightShoulder);
  const distance = Points.distance(leftWrist, rightWrist);
  const heart = distance / 2;

  const console = /** @type HTMLElement */(document.getElementById('console'));
  console.innerHTML = `Left wrist -  Right wrist: ${distance}`;

  saveState({leftWrist, rightWrist, centroid});

  return {
    x: centroid.x,
    y: centroid.y,
    heart,
    poseId: (pose.id ?? 0).toString()
  };
};

const draw = () => {
  const { width, height } = state.bounds;
  const { distances } = state;
  const context = settings.canvasEl.getContext(`2d`);
  if (!context) return;

  // Fade out the canvas
  context.fillStyle = `rgba(0,0,0,0.015)`;
  context.fillRect(0, 0, width, height);

  // Draw each head
  for (const distance of distances) {
    drawHead(context, distance);
  }
};

/**
 * Draws a single head
 * @param {CanvasRenderingContext2D} context 
 * @param {Distance} distance 
 */
const drawHead = (context, distance) => {
  const { scaleBy } = state;
  const { poses } = settings;

  const distanceAbs = Points.multiplyScalar(distance,scaleBy);
  const radius = distance.heart*scaleBy;
  const tracker = poses.getByPoseId(distance.poseId);
  if (tracker === undefined) return;
  const hue = tracker.hue;
  
  // Translate canvas so 0,0 is the center of head
  context.save();
  context.translate(distanceAbs.x, distanceAbs.y);

  // Draw a circle
  context.beginPath();
  context.fillStyle = `hsl(${hue},60%,70%)`;
  context.arc(0,0,radius,0,Math.PI*2);
  context.fill();


  // Draw id of head
  context.fillStyle = `black`;
  context.fillText(distance.poseId.toString(), 0, 0);

  // Undo translation
  context.restore();
};

/**
 * Called when a new pose is detecteda
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

/**
 * Called when we have pose data via Remote
 * @param {*} packet 
 */
const onReceivedPoses = (packet) => {
  const { _from, data } = packet;
  const poseData =/** @type MoveNet.Pose[] */(data);
  
  // Pass each pose over to the poses tracker
  for (const pose of poseData) {
    settings.poses.seen(_from, pose);
  }
};

/**
 * Setup and run main loop 
 */
function setup() {
  const { updateRateMs, remote, poses } = settings;
  
  remote.onData = onReceivedPoses;
  poses.events.addEventListener(`added`, onPoseAdded);
  poses.events.addEventListener(`expired`, onPoseExpired);

  Dom.fullSizeCanvas(`#canvas`, arguments_ => {
    // Update state with new size of canvas
    saveState({ 
      bounds: arguments_.bounds,
      scaleBy: Math.min(arguments_.bounds.width, arguments_.bounds.height)
    });
  });

  // Update at updateRateMs
  const updateLoop = () => {
    update();
    setTimeout(updateLoop, updateRateMs);
  };
  updateLoop();

  // Draw as fast as possible
  const animationLoop = () => {
    draw();
    window.requestAnimationFrame(animationLoop);
  };
  animationLoop();

};
setup();

/**
 * Update state
 * @param {Partial<state>} s 
 */
function saveState (s) {
  state = Object.freeze({
    ...state,
    ...s
  });
}
