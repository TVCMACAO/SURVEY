import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'dart:async';
import '../utils/constants.dart';

class NetworkService {
  static final NetworkService instance = NetworkService._init();
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  
  NetworkService._init();

  Stream<ConnectivityResult> get connectivityStream => 
      _connectivity.onConnectivityChanged;

  Future<bool> isConnected() async {
    final result = await _connectivity.checkConnectivity();
    if (result == ConnectivityResult.none) {
      return false;
    }
    
    try {
      final response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.health}'),
      ).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      try {
        await http.head(
          Uri.parse('${ApiConstants.baseUrl}/'),
        ).timeout(const Duration(seconds: 5));
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  // Verificar si hay conexión WiFi o móvil
  Future<bool> hasInternetConnection() async {
    return await isConnected();
  }

  // Obtener tipo de conexión actual
  Future<ConnectivityResult> getConnectivityStatus() async {
    return await _connectivity.checkConnectivity();
  }

  // Suscribirse a cambios de conectividad
  void listenToConnectivityChanges(Function(ConnectivityResult) callback) {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((result) async {
      // Verificar conectividad real cuando cambia (actualizar estado interno)
      await isConnected();
      callback(result);
    });
  }

  // Cancelar suscripción
  void cancelSubscription() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }

  void dispose() {
    cancelSubscription();
  }
}

