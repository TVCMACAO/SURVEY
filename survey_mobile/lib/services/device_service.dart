import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../utils/constants.dart';

class DeviceService {
  static final DeviceService instance = DeviceService._init();
  DeviceService._init();

  String? _cachedDeviceId;

  Future<String> getDeviceId() async {
    if (_cachedDeviceId != null) return _cachedDeviceId!;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(StorageKeys.deviceId);
    if (id == null || id.isEmpty) {
      id = 'device_${const Uuid().v4()}';
      await prefs.setString(StorageKeys.deviceId, id);
    }
    _cachedDeviceId = id;
    return id;
  }
}
