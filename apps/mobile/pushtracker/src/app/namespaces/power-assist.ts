import { Color } from 'tns-core-modules/color';

export namespace PowerAssist {
  export const InactiveRingColor = new Color('#000000');
  export const ActiveRingColor = new Color('#006ea4');
  export const TrainingRingColor = new Color('#00a73c');
  export const ConnectedRingColor = new Color('#006ea4');
  export const DisconnectedRingColor = new Color('#db4537');

  export enum State {
    Inactive,
    Disconnected,
    Connected,
    Training
  }
}
