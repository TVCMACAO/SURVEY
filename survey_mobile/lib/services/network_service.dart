import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'dart:async';
import '../utils/constants.dart';

class NetworkService {
  static final NetworkService instance = NetworkService._init();
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  
  NetworkService._init();

  // Stream para escuchar cambios de conectividad
  Stream<ConnectivityResult> get connectivityStream => 
      _connectivity.onConnectivityChanged;

  // Verificar conectividad REAL (verificando que hay red y servidor accesible)
  Future<bool> isConnected() async {
    final result = await _connectivity.checkConnectivity();
    if (result == ConnectivityResult.none) {
      return false;
    }
    
    // Verificar conectividad real haciendo una petición HEAD a la base URL
    // Esto no requiere autenticación y solo verifica que el servidor responde
    try {
      await http.head(
        Uri.parse('${ApiConstants.baseUrl}/'),
      ).timeout(const Duration(seconds: 5));
      
      // Cualquier respuesta (incluso 404) significa que hay servidor accesible
      return true;
    } catch (e) {
      // Si falla, intentar con una petición GET simple a un endpoint público
      try {
        // Intentar con un endpoint que sabemos que existe (aunque pueda dar 404)
        await http.get(
          Uri.parse('${ApiConstants.baseUrl}/public/surveys/test'),
        ).timeout(const Duration(seconds: 3));
        
        // Cualquier respuesta significa que hay servidor
        return true;
      } catch (e2) {
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

