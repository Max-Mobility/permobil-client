#include <emscripten/bind.h>

#include <string>
#include <vector>
#include <iostream>

/*** Motor ***/
class Motor
{
public:
  enum class State : uint8_t
  {
    Off,
    On,
    Error
  };
};

/*** Smart Drive ***/
class SmartDrive
{
public:
  enum class Error : uint8_t;
  enum class ControlMode : uint8_t;
  enum class Units : uint8_t;
  enum class AttendantMode : uint8_t;
  enum class ThrottleMode : uint8_t;

  enum class Error : uint8_t
  {
    NoError,
    BatteryVoltage,
    MotorPhases,
    OverCurrent,
    OverTemperature,
    GyroRange,
    OTAUnavailable,
    BLEDisconnect
  };

  enum class ControlMode : uint8_t
  {
    Beginner,
    Intermediate,
    Advanced,
    Off
  };

  enum class Units : uint8_t
  {
    English,
    Metric
  };

  enum class AttendantMode : uint8_t
  {
    Off,
    Inactive,
    OnePressed,
    TwoPressed,
    Latching
  };

  enum class ThrottleMode : uint8_t
  {
    Active,
    Latching
  };

  // settings flags values are the bit numbers
  enum class BoolSettingFlag : uint8_t
  {
    EZMODE = 0
  };

  struct Settings
  {
    ControlMode controlMode;
    Units units;
    uint8_t settingsFlags1; /** Bitmask of boolean settings.      */
    uint8_t padding;
    float tapSensitivity; /** Slider setting, range: [0.1, 1.0] */
    float acceleration;   /** Slider setting, range: [0.1, 1.0] */
    float maxSpeed;       /** Slider setting, range: [0.1, 1.0] */
  };
  static const int settingsLength = sizeof(Settings);

  static bool getBoolSetting(const Settings *s, BoolSettingFlag boolSetting)
  {
    return (bool)((s->settingsFlags1 >> (uint8_t)boolSetting) & 0x01);
  }

  struct ThrottleSettings
  {
    ThrottleMode throttleMode; /** Bitmask of boolean settings.      */
    uint8_t padding1;
    uint8_t padding2;
    uint8_t padding3;
    float maxSpeed; /** Slider setting, range: [0.1, 1.0] */
  };
  static const int throttleSettingsLength = sizeof(ThrottleSettings);
};

/*** Packet ***/

class Packet
{
public:
  // Main Type of the packet
  enum class Type : uint8_t
  {
    None,
    Data,
    Command,
    Error,
    OTA
  };

  // Subtypes of the packet
  enum class Data : uint8_t;
  enum class Command : uint8_t;
  enum class OTA : uint8_t;

  enum class Data : uint8_t
  {
    MotorDistance,
    Speed,
    CoastTime,
    Pushes,
    MotorState,
    BatteryLevel,
    VersionInfo,
    DailyInfo,
    JourneyInfo,
    MotorInfo,
    DeviceInfo,
    Ready,
    ErrorInfo,
    PushSettings
  };

  enum class Command : uint8_t
  {
    SetAcceleration,
    SetMaxSpeed,
    Tap,
    DoubleTap,
    SetControlMode,
    SetSettings,
    TurnOffMotor,
    StartJourney,
    StopJourney,
    PauseJourney,
    SetTime,
    StartOTA,
    StopOTA,
    OTAReady,
    CancelOTA,
    Wake,
    DistanceRequest,
    StartGame,
    StopGame,
    ConnectMPGame,
    DisconnectMPGame,
    SetPushSettings,
    SetLEDColor,
    SetThrottleSettings
  };

  enum class OTA : uint8_t
  {
    SmartDrive,
    SmartDriveBluetooth,
    PushTracker
  };

  enum class Device : uint8_t
  {
    SmartDrive,
    SmartDriveBluetooth,
    PushTracker
  };

  enum class Game : uint8_t
  {
    Mario,
    Snake,
    Sonic,
    Tunnel,
    FlappyBird,
    Pong
  };

  static const int numTypeBytes = 1;
  static const int numSubTypeBytes = 1;
  static const int maxDataLength = 16;
  static const int minDataLength = 0;
  static const int maxSize = numTypeBytes + numSubTypeBytes + maxDataLength;
  static const int minSize = numTypeBytes + numSubTypeBytes + minDataLength;

  // Version Info
  struct VersionInfo
  {
    uint8_t pushTracker;         /** Major.Minor version as the MAJOR and MINOR nibbles of the byte. **/
    uint8_t smartDrive;          /** Major.Minor version as the MAJOR and MINOR nibbles of the byte. **/
    uint8_t smartDriveBluetooth; /** Major.Minor version as the MAJOR and MINOR nibbles of the byte. **/
  };

  // Push Settings
  struct PushSettings
  {
    uint8_t threshold;    /** Push Detection Threshold, [0, 255]                      */
    uint8_t timeWindow;   /** Push Detection Time Window, [0, 255]                    */
    uint8_t clearCounter; /** Does the counter clear for data below threshold? [0, 1] */
  };

  // Daily Info
  struct DailyInfo
  {
    uint16_t year;
    uint8_t month;
    uint8_t day;
    uint16_t pushesWith;    /** Raw integer number of pushes. */
    uint16_t pushesWithout; /** Raw integer number of pushes. */
    uint16_t coastWith;     /** Coast Time (s) * 100.         */
    uint16_t coastWithout;  /** Coast Time Without (s) * 100. */
    uint8_t distance;       /** Distance (mi) * 10.           */
    uint8_t speed;          /** Speed (mph) * 10.             */
    uint8_t ptBattery;      /** Percent, [0, 100].            */
    uint8_t sdBattery;      /** Percent, [0, 100].            */
  };

  // Journey Info
  struct JourneyInfo
  {
    uint16_t pushes;  /** Raw integer number of pushes. */
    uint8_t distance; /** Distance (mi) * 10.           */
    uint8_t speed;    /** Speed (mph) * 10.             */
  };

  // Motor Info
  struct MotorInfo
  {
    Motor::State state;
    uint8_t batteryLevel; /** [0,100] integer percent. */
    uint8_t version;      /** Major.Minor version as the MAJOR and MINOR nibbles of the byte. **/
    uint8_t padding;
    float distance;
    float speed;
    float driveTime;
  };

  // Time Info  (for SetTime)
  struct TimeInfo
  {
    uint16_t year;
    uint8_t month;
    uint8_t day;
    uint8_t hours;
    uint8_t minutes;
    uint8_t seconds;
  };

  // Used for just sending device info between devices
  struct DeviceInfo
  {
    Device device;   /** Which Device is this about? **/
    uint8_t version; /** Major.Minor version as the MAJOR and MINOR nibbles of the byte. **/
  };

  // Error Info (sent by the PT to the app)
  struct ErrorInfo
  {
    uint16_t year;
    uint8_t month;
    uint8_t day;
    uint8_t hour;
    uint8_t minute;
    uint8_t second;
    SmartDrive::Error mostRecentError; /** Type of the most recent error, associated with the timeStamp. **/
    uint8_t numBatteryVoltageErrors;
    uint8_t numOverCurrentErrors;
    uint8_t numMotorPhaseErrors;
    uint8_t numGyroRangeErrors;
    uint8_t numOverTemperatureErrors;
    uint8_t numBLEDisconnectErrors;
  };

  // BatteryInfo: Used for keeping track of battery and last time
  // battery was updated between PT and App, so the app knows the
  // PT and SD battery and when the SD battery data was last
  // received (as a time stamp). Note that the SmartDrive battery
  // will only be non-zero if the PushTracker has connected to it
  // today, so the only timestamp we need is HH:MM:SS
  struct BatteryInfo
  {
    uint8_t hour;
    uint8_t minute;
    uint8_t second;
    uint8_t smartDriveBatteryLevel;  /** [0,100] */
    uint8_t pushTrackerBatteryLevel; /** [0,100] */
  };

  // DistanceInfo: How far have the motor and case gone?
  struct DistanceInfo
  {
    uint64_t motorDistance; /** Cumulative Drive distance in ticks. **/
    uint64_t caseDistance;  /** Cumulative Case distance in ticks. **/
  };

  // The length of data bytes contained in the packet
  int dataLength;

  // The actual type contained in the packet
  Type type;

  // The actual subtype contained in the packet
  union {
    Data data;
    Command command;
    SmartDrive::Error error;
    OTA ota;
  };

  // The actual data contained in the packet
  union {
    SmartDrive::Settings settings;
    SmartDrive::ThrottleSettings throttleSettings;
    PushSettings pushSettings;
    VersionInfo versionInfo;
    DailyInfo dailyInfo;
    JourneyInfo journeyInfo;
    MotorInfo motorInfo;
    TimeInfo timeInfo;
    DeviceInfo deviceInfo;
    ErrorInfo errorInfo;
    BatteryInfo batteryInfo;
    DistanceInfo distanceInfo;

    /**
     * Used with StartOTA / StopOTA commands, tells which device the
     * subsequent OTA data is for.  The command should be relayed to
     * that device.
     */
    OTA otaDevice;

    Game game;

    SmartDrive::ControlMode controlMode;
    SmartDrive::Units units;
    Motor::State motorState;
    uint64_t motorDistance; /** Cumulative Drive distance in ticks for MotorDistance packet. **/
    float motorSpeed;
    float coastTime;
    uint16_t pushes;
    uint8_t batteryLevel;
    float acceleration;
    float maxSpeed;
    uint64_t errorId; /** Unique ID when an Error Packet is sent. **/
    uint8_t bytes[maxDataLength];
  };

  Packet()
  {
    newPacket();
  }

  ~Packet() {}

  Packet &operator=(const Packet &rhs)
  {
    if (this == &rhs)
      return *this;

    _valid = rhs._valid;
    type = rhs.type;

    for (int i = 0; i < Packet::maxDataLength; i++)
    {
      bytes[i] = rhs.bytes[i];
    }

    return *this;
  }

  bool valid(void)
  {
    return _valid;
  }

  bool processPacket(std::string rawData)
  {
    int size = rawData.size();
    //std::cout << "Packet size: " << size << std::endl;
    if (size < Packet::minSize || size > Packet::maxSize)
      return false;

    int dataIndex = 2;
    int subTypeIndex = 1;
    int typeIndex = 0;

    type = (Packet::Type)rawData[typeIndex];

    switch (type)
    {
    case Packet::Type::Data:
      data = (Packet::Data)rawData[subTypeIndex];
      break;
    case Packet::Type::Command:
      command = (Packet::Command)rawData[subTypeIndex];
      break;
    case Packet::Type::Error:
      error = (SmartDrive::Error)rawData[subTypeIndex];
      break;
    case Packet::Type::OTA:
      break;
    default:
      return false;
      break;
    }

    dataLength = size - 2;

    for (int i = 0; i < dataLength; i++)
    {
      bytes[i] = rawData[dataIndex + i];
    }

    return true;
  }

  void newPacket(void)
  {
    dataLength = 0;
    _valid = false;
    type = Packet::Type::None;
  }

  std::vector<uint8_t> format()
  {
    std::vector<uint8_t> output;
    int numBytes = Packet::minSize;
    output.push_back((uint8_t)type);
    int dataLen = 0;
    switch (type)
    {
    case Packet::Type::Data:
      output.push_back((uint8_t)data);
      switch (data)
      {
      case Packet::Data::MotorDistance:
        dataLen = sizeof(distanceInfo);
        break;
      case Packet::Data::Speed:
        dataLen = sizeof(motorSpeed);
        break;
      case Packet::Data::CoastTime:
        dataLen = sizeof(coastTime);
        break;
      case Packet::Data::Pushes:
        dataLen = sizeof(pushes);
        break;
      case Packet::Data::MotorState:
        dataLen = sizeof(motorState);
        break;
      case Packet::Data::BatteryLevel:
        dataLen = sizeof(batteryLevel);
        break;
      case Packet::Data::VersionInfo:
        dataLen = sizeof(versionInfo);
        break;
      case Packet::Data::DailyInfo:
        dataLen = sizeof(dailyInfo);
        break;
      case Packet::Data::JourneyInfo:
        dataLen = sizeof(journeyInfo);
        break;
      case Packet::Data::MotorInfo:
        dataLen = sizeof(motorInfo);
        break;
      case Packet::Data::DeviceInfo:
        dataLen = sizeof(deviceInfo);
        break;
      case Packet::Data::Ready:
        dataLen = 0;
        break;
      case Packet::Data::ErrorInfo:
        dataLen = sizeof(errorInfo);
        break;
      case Packet::Data::PushSettings:
        dataLen = sizeof(pushSettings);
        break;
      default:
        break;
      }
      break;
    case Packet::Type::Command:
      output.push_back((uint8_t)command);
      switch (command)
      {
      case Packet::Command::SetAcceleration:
        dataLen = sizeof(acceleration);
        break;
      case Packet::Command::SetMaxSpeed:
        dataLen = sizeof(maxSpeed);
        break;
      case Packet::Command::Tap:
        break;
      case Packet::Command::DoubleTap:
        break;
      case Packet::Command::SetControlMode:
        dataLen = sizeof(controlMode);
        break;
      case Packet::Command::SetSettings:
        dataLen = sizeof(settings);
        break;
      case Packet::Command::TurnOffMotor:
        break;
      case Packet::Command::StartJourney:
        break;
      case Packet::Command::StopJourney:
        break;
      case Packet::Command::PauseJourney:
        break;
      case Packet::Command::SetTime:
        dataLen = sizeof(timeInfo);
        break;
      case Packet::Command::StartOTA:
        dataLen = sizeof(otaDevice);
        break;
      case Packet::Command::StopOTA:
        dataLen = sizeof(otaDevice);
        break;
      case Packet::Command::OTAReady:
        break;
      case Packet::Command::CancelOTA:
        break;
      case Packet::Command::Wake:
        break;
      case Packet::Command::DistanceRequest:
        break;
      case Packet::Command::SetPushSettings:
        dataLen = sizeof(pushSettings);
        break;
      case Packet::Command::SetLEDColor:
        // TODO: need to flesh out this packet def.
        break;
      case Packet::Command::SetThrottleSettings:
        dataLen = sizeof(throttleSettings);
        break;
      default:
        break;
      }
      break;
    case Packet::Type::Error:
      output.push_back((uint8_t)error);
      // errors are sent with a unique ID
      dataLen = sizeof(errorId);
      break;
    case Packet::Type::OTA:
      output.push_back((uint8_t)ota);
      // NOTE: YOU MUST SET THE DATALENGTH BY CALLING:
      //   `packet.length = <size of ota data>`
      dataLen = dataLength;
      break;
    default:
      break;
    }

    for (int i = 0; i < dataLen; i++)
    {
      output.push_back(bytes[i]);
    }

    numBytes += dataLen;

    output.shrink_to_fit();
    return output;
  }

  std::vector<uint8_t> getBytes() const
  {
    std::vector<uint8_t> b;
    for (int i = 0; i < maxDataLength; i++)
      b.push_back((uint8_t)bytes[i]);
    return b;
  }
  void setBytes(std::vector<uint8_t> b)
  {
    for (int i = 0; i < b.size(); i++)
    {
      bytes[i] = (uint8_t)b[i];
    }
  }

  void setMotorDistance(int d)
  {
    distanceInfo.motorDistance = (uint64_t)d;
  }
  int getMotorDistance() const
  {
    return (int)distanceInfo.motorDistance;
  }

  void setCaseDistance(int d)
  {
    distanceInfo.caseDistance = (uint64_t)d;
  }
  int getCaseDistance() const
  {
    return (int)distanceInfo.caseDistance;
  }

  void setErrorId(int e)
  {
    errorId = (uint64_t)e;
  }
  int getErrorId() const
  {
    return (int)errorId;
  }

private:
  bool _valid;
};

// BINDING CODE FOR JAVASCRIPT
EMSCRIPTEN_BINDINGS(packet_bindings)
{
  emscripten::register_vector<uint8_t>("VectorInt");

  emscripten::enum_<Motor::State>("MotorState")
      .value("Off", Motor::State::Off)
      .value("On", Motor::State::On)
      .value("Error", Motor::State::Error);

  emscripten::enum_<SmartDrive::Units>("Units")
      .value("English", SmartDrive::Units::English)
      .value("Metric", SmartDrive::Units::Metric);

  emscripten::enum_<SmartDrive::ControlMode>("SmartDriveControlMode")
      .value("Beginner", SmartDrive::ControlMode::Beginner)
      .value("Intermediate", SmartDrive::ControlMode::Intermediate)
      .value("Advanced", SmartDrive::ControlMode::Advanced)
      .value("Off", SmartDrive::ControlMode::Off);

  emscripten::enum_<SmartDrive::ThrottleMode>("ThrottleMode")
      .value("Active", SmartDrive::ThrottleMode::Active)
      .value("Latching", SmartDrive::ThrottleMode::Latching);

  emscripten::value_object<SmartDrive::Settings>("SmartDriveSettings")
      .field("ControlMode", &SmartDrive::Settings::controlMode)
      .field("Units", &SmartDrive::Settings::units)
      .field("Flags", &SmartDrive::Settings::settingsFlags1)
      .field("Padding", &SmartDrive::Settings::padding)
      .field("TapSensitivity", &SmartDrive::Settings::tapSensitivity)
      .field("Acceleration", &SmartDrive::Settings::acceleration)
      .field("MaxSpeed", &SmartDrive::Settings::maxSpeed);

  emscripten::value_object<SmartDrive::ThrottleSettings>("ThrottleSettings")
      .field("ThrottleMode", &SmartDrive::ThrottleSettings::throttleMode)
      .field("Padding1", &SmartDrive::ThrottleSettings::padding1)
      .field("Padding2", &SmartDrive::ThrottleSettings::padding2)
      .field("Padding3", &SmartDrive::ThrottleSettings::padding3)
      .field("MaxSpeed", &SmartDrive::ThrottleSettings::maxSpeed);

  // PACKET BINDINGS
  emscripten::enum_<Packet::Device>("Device")
      .value("SmartDrive", Packet::Device::SmartDrive)
      .value("SmartDriveBluetooth", Packet::Device::SmartDriveBluetooth)
      .value("PushTracker", Packet::Device::PushTracker);

  emscripten::enum_<Packet::Type>("PacketType")
      .value("None", Packet::Type::None)
      .value("Data", Packet::Type::Data)
      .value("Command", Packet::Type::Command)
      .value("Error", Packet::Type::Error)
      .value("OTA", Packet::Type::OTA);

  emscripten::enum_<Packet::Data>("PacketDataType")
      .value("MotorDistance", Packet::Data::MotorDistance)
      .value("Speed", Packet::Data::Speed)
      .value("CoastTime", Packet::Data::CoastTime)
      .value("Pushes", Packet::Data::Pushes)
      .value("MotorState", Packet::Data::MotorState)
      .value("BatteryLevel", Packet::Data::BatteryLevel)
      .value("VersionInfo", Packet::Data::VersionInfo)
      .value("DailyInfo", Packet::Data::DailyInfo)
      .value("JourneyInfo", Packet::Data::JourneyInfo)
      .value("MotorInfo", Packet::Data::MotorInfo)
      .value("DeviceInfo", Packet::Data::DeviceInfo)
      .value("Ready", Packet::Data::Ready)
      .value("ErrorInfo", Packet::Data::ErrorInfo)
      .value("PushSettings", Packet::Data::PushSettings);

  emscripten::value_object<Packet::VersionInfo>("VersionInfo")
      .field("pushTracker", &Packet::VersionInfo::pushTracker)
      .field("smartDrive", &Packet::VersionInfo::smartDrive)
      .field("smartDriveBluetooth", &Packet::VersionInfo::smartDriveBluetooth);

  emscripten::value_object<Packet::DailyInfo>("DailyInfo")
      .field("year", &Packet::DailyInfo::year)
      .field("month", &Packet::DailyInfo::month)
      .field("day", &Packet::DailyInfo::day)
      .field("pushesWith", &Packet::DailyInfo::pushesWith)
      .field("pushesWithout", &Packet::DailyInfo::pushesWithout)
      .field("coastWith", &Packet::DailyInfo::coastWith)
      .field("coastWithout", &Packet::DailyInfo::coastWithout)
      .field("distance", &Packet::DailyInfo::distance)
      .field("speed", &Packet::DailyInfo::speed)
      .field("ptBattery", &Packet::DailyInfo::ptBattery)
      .field("sdBattery", &Packet::DailyInfo::sdBattery);

  emscripten::value_object<Packet::PushSettings>("PushSettings")
      .field("threshold", &Packet::PushSettings::threshold)
      .field("timeWindow", &Packet::PushSettings::timeWindow)
      .field("clearCounter", &Packet::PushSettings::clearCounter);

  emscripten::value_object<Packet::JourneyInfo>("JourneyInfo")
      .field("pushes", &Packet::JourneyInfo::pushes)
      .field("distance", &Packet::JourneyInfo::distance)
      .field("speed", &Packet::JourneyInfo::speed);

  emscripten::value_object<Packet::DistanceInfo>("DistanceInfo")
      .field("motorDistance", &Packet::DistanceInfo::motorDistance)
      .field("caseDistance", &Packet::DistanceInfo::caseDistance);

  emscripten::value_object<Packet::MotorInfo>("MotorInfo")
      .field("state", &Packet::MotorInfo::state)
      .field("batteryLevel", &Packet::MotorInfo::batteryLevel)
      .field("version", &Packet::MotorInfo::version)
      .field("padding", &Packet::MotorInfo::padding)
      .field("distance", &Packet::MotorInfo::distance)
      .field("speed", &Packet::MotorInfo::speed)
      .field("driveTime", &Packet::MotorInfo::driveTime);

  emscripten::value_object<Packet::ErrorInfo>("ErrorInfo")
      .field("year", &Packet::ErrorInfo::year)
      .field("month", &Packet::ErrorInfo::year)
      .field("day", &Packet::ErrorInfo::year)
      .field("hour", &Packet::ErrorInfo::year)
      .field("minute", &Packet::ErrorInfo::year)
      .field("second", &Packet::ErrorInfo::year)
      .field("mostRecentError", &Packet::ErrorInfo::mostRecentError)
      .field("numBatteryVoltageErrors", &Packet::ErrorInfo::numBatteryVoltageErrors)
      .field("numOverCurrentErrors", &Packet::ErrorInfo::numOverCurrentErrors)
      .field("numMotorPhaseErrors", &Packet::ErrorInfo::numMotorPhaseErrors)
      .field("numGyroRangeErrors", &Packet::ErrorInfo::numGyroRangeErrors)
      .field("numOverTemperatureErrors", &Packet::ErrorInfo::numOverTemperatureErrors)
      .field("numBLEDisconnectErrors", &Packet::ErrorInfo::numBLEDisconnectErrors);

  emscripten::value_object<Packet::DeviceInfo>("DeviceInfo")
      .field("device", &Packet::DeviceInfo::device)
      .field("version", &Packet::DeviceInfo::version);

  emscripten::enum_<Packet::Command>("PacketCommandType")
      .value("SetAcceleration", Packet::Command::SetAcceleration)
      .value("SetMaxSpeed", Packet::Command::SetMaxSpeed)
      .value("Tap", Packet::Command::Tap)
      .value("DoubleTap", Packet::Command::DoubleTap)
      .value("SetControlMode", Packet::Command::SetControlMode)
      .value("SetSettings", Packet::Command::SetSettings)
      .value("TurnOffMotor", Packet::Command::TurnOffMotor)
      .value("StartJourney", Packet::Command::StartJourney)
      .value("StopJourney", Packet::Command::StopJourney)
      .value("PauseJourney", Packet::Command::PauseJourney)
      .value("SetTime", Packet::Command::SetTime)
      .value("StartOTA", Packet::Command::StartOTA)
      .value("StopOTA", Packet::Command::StopOTA)
      .value("OTAReady", Packet::Command::OTAReady)
      .value("CancelOTA", Packet::Command::CancelOTA)
      .value("Wake", Packet::Command::Wake)
      .value("DistanceRequest", Packet::Command::DistanceRequest)
      .value("StartGame", Packet::Command::StartGame)
      .value("StopGame", Packet::Command::StopGame)
      .value("ConnectMPGame", Packet::Command::ConnectMPGame)
      .value("DisconnectMPGame", Packet::Command::DisconnectMPGame)
      .value("SetPushSettings", Packet::Command::SetPushSettings)
      .value("SetLEDColor", Packet::Command::SetLEDColor)
      .value("SetThrottleSettings", Packet::Command::SetThrottleSettings);

  emscripten::enum_<Packet::OTA>("PacketOTAType")
      .value("SmartDrive", Packet::OTA::SmartDrive)
      .value("SmartDriveBluetooth", Packet::OTA::SmartDriveBluetooth)
      .value("PushTracker", Packet::OTA::PushTracker);

  emscripten::enum_<SmartDrive::Error>("PacketErrorType")
      .value("NoError", SmartDrive::Error::NoError)
      .value("BatteryVoltage", SmartDrive::Error::BatteryVoltage)
      .value("MotorPhases", SmartDrive::Error::MotorPhases)
      .value("OverCurrent", SmartDrive::Error::OverCurrent)
      .value("OverTemperature", SmartDrive::Error::OverTemperature)
      .value("GyroRange", SmartDrive::Error::GyroRange)
      .value("OTAUnavailable", SmartDrive::Error::OTAUnavailable)
      .value("BLEDisconnect", SmartDrive::Error::BLEDisconnect);

  emscripten::class_<Packet>("Packet")
      .constructor<>()
      .function("valid", &Packet::valid)
      .function("processPacket", &Packet::processPacket)
      .function("newPacket", &Packet::newPacket)
      .function("format", &Packet::format)

      // Type Info
      .property("length", &Packet::dataLength)

      // Type Info
      .property("Type", &Packet::type)

      // SubType Info
      .property("Data", &Packet::data)
      .property("Command", &Packet::command)
      .property("Error", &Packet::error)
      .property("OTA", &Packet::ota)

      // Actual payload info
      .property("settings", &Packet::settings)
      .property("throttleSettings", &Packet::throttleSettings)
      .property("pushSettings", &Packet::pushSettings)
      .property("versionInfo", &Packet::versionInfo)
      .property("dailyInfo", &Packet::dailyInfo)
      .property("journeyInfo", &Packet::journeyInfo)
      .property("motorInfo", &Packet::motorInfo)
      .property("timeInfo", &Packet::timeInfo)
      .property("deviceInfo", &Packet::deviceInfo)
      .property("errorInfo", &Packet::errorInfo)
      .property("batteryInfo", &Packet::batteryInfo)
      .property("distanceInfo", &Packet::distanceInfo)

      .property("errorId", &Packet::getErrorId, &Packet::setErrorId)

      .property("OTADevice", &Packet::otaDevice)

      .property("motorDistance", &Packet::getMotorDistance, &Packet::setMotorDistance)
      .property("caseDistance", &Packet::getCaseDistance, &Packet::setCaseDistance)

      .property("bytes", &Packet::getBytes, &Packet::setBytes);
}