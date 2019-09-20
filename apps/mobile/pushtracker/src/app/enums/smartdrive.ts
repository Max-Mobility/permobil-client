export enum SMARTDRIVE_MODE {
    OFF = 'Off',
    MX1 = 'MX1',
    MX2 = 'MX2',
    MX2_PLUS = 'MX2+'
}

export enum SMARTDRIVE_MODE_SETTING {
    OFF = 'Off',
    BEGINNER = 'Beginner',
    INTERMEDIATE = 'Intermediate',
    ADVANCED = 'Advanced'
}

export enum SMARTDRIVE_UNIT {
    METRIC = 'Metric',
    ENGLISH = 'English'
}

export enum SMARTDRIVE_PACKET_TYPE {
    DATA = 'Data',
    COMMAND = 'Command',
    ERROR = 'Error'
}

export enum SMARTDRIVE_PACKET_SUBTYPE {
    DEVICE_INFO = 'DeviceInfo',
    MOTOR_INFO = 'MotorInfo',
    MOTOR_DISTANCE = 'MotorDistance',
    OTA_READY = 'OTAReady'
}