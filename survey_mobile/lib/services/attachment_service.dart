import 'dart:io';
import 'package:dio/dio.dart';
import '../utils/constants.dart';
import 'auth_service.dart';

class AttachmentUploadResult {
  final String id;
  final String filename;

  AttachmentUploadResult({required this.id, required this.filename});
}

class AttachmentService {
  static final AttachmentService instance = AttachmentService._init();
  final Dio _dio = Dio();

  AttachmentService._init();

  static const int maxFileSizeBytes = 10 * 1024 * 1024;
  static const allowedMimeTypes = {
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  };

  String _normalizeMime(String mime) {
    if (mime == 'image/jpg' || mime == 'image/pjpeg') return 'image/jpeg';
    return mime;
  }

  Future<AttachmentUploadResult> uploadFile(
    File file, {
    String? documentoEmpleado,
    String? documentoVotante,
  }) async {
    if (!await file.exists()) {
      throw Exception('Archivo no encontrado');
    }
    final size = await file.length();
    if (size > maxFileSizeBytes) {
      throw Exception('El archivo supera el límite de 10 MB');
    }

    final token = await AuthService.instance.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Sesión expirada. Inicia sesión nuevamente.');
    }

    final filename = file.path.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: filename),
      if (documentoEmpleado != null && documentoEmpleado.isNotEmpty)
        'documento_empleado': documentoEmpleado,
      if (documentoVotante != null && documentoVotante.isNotEmpty)
        'documento_votante': documentoVotante,
    });

    final response = await _dio.post(
      '${ApiConstants.baseUrl}${ApiConstants.attachments}',
      data: formData,
      options: Options(
        headers: {'Authorization': 'Bearer $token'},
        sendTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    if (response.statusCode == 201) {
      final data = response.data is Map ? response.data as Map : {};
      return AttachmentUploadResult(
        id: data['id']?.toString() ?? '',
        filename: data['filename']?.toString() ?? filename,
      );
    }
    throw Exception('Error al subir archivo: ${response.statusCode}');
  }

  String guessMimeType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    return 'application/octet-stream';
  }

  bool isAllowedMime(String mime) {
    return allowedMimeTypes.contains(_normalizeMime(mime));
  }
}
