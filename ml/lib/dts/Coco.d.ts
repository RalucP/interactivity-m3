import { Pose } from "./Types.js";
export declare enum NamedKeypoints {
    'nose' = 0,
    'left_eye' = 1,
    'right_eye' = 2,
    'left_ear' = 3,
    'right_ear' = 4,
    'left_shoulder' = 5,
    'right_shoulder' = 6,
    'left_elbow' = 7,
    'right_elbow' = 8,
    'left_wrist' = 9,
    'right_wrist' = 10,
    'left_hip' = 11,
    'right_hip' = 12,
    'left_knee' = 13,
    'right_knee' = 14,
    'left_ankle' = 15,
    'right_ankle' = 16
}
export declare const nameToIndex: Map<string, number>;
export declare const indexToName: Map<number, string>;
export declare const getKeypoint: (pose: Pose, nameOrIndex: string | number) => import("./Types.js").Keypoint;
//# sourceMappingURL=Coco.d.ts.map