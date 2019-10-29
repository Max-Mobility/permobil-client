export class SmartDriveException extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'SmartDriveMX2+ Exception';
  }
}
