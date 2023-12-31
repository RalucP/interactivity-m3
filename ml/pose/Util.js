import {Lines,Points} from '../../ixfx/geometry.js';
import * as Types from '../lib/Types.js';

import * as Coco from '../lib/Coco.js';

/**
 * Sorts `poses` by horziontal
 * @param {Types.Pose[]} poses 
 */
export const horizontalSort = (poses) => {
  const withCentroids = poses.map(p => ({
    ...p,
    centroid:centroid(p)}));
  withCentroids.sort((a,b) => a.centroid.x-b.centroid.y);
  return withCentroids;
};

/**
 * Return centroid of Pose
 * @param {Types.Pose} pose 
 */
export const centroid = (pose) => Points.centroid(...pose.keypoints);

/**
 * Returns a line between two named keypoints.
 * If either of the two points are not found, _undefined_ is returned.
 * @param {Types.Pose} pose 
 * @param {string} a 
 * @param {string} b 
 * @returns {Lines.Line|undefined}
 */
export const lineBetween = (pose, a, b) => {
  const ptA = Coco.getKeypoint(pose, a);
  const ptB = Coco.getKeypoint(pose, b);
  if (ptA === undefined) return;
  if (ptB === undefined) return;
  return Object.freeze({
    a: ptA,
    b: ptB
  });
};

/**
 * Returns the rough center of a pose, based on
 * the chest coordinates
 * @param {Types.Pose} pose 
 */
export const roughCenter = (pose) => {
  const a = lineBetween(pose, `left_shoulder`, `right_hip`);
  const b = lineBetween(pose, `right_shoulder`, `left_hip`);
  if (a === undefined) return;
  if (b === undefined) return;

  // Get halfway of each line
  const halfA = Lines.interpolate(0.5,a);
  const halfB = Lines.interpolate(0.5,b);

  // Add them up
  const sum = Points.sum(halfA, halfB);

  // Divide to get avg
  return Points.divide(sum,2,2);
};
