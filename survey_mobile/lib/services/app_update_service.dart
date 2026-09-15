import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

import '../utils/constants.dart';

class AppReleaseInfo {
  final String version;
  final int versionCode;
  final String downloadUrl;
  final int minSupportedVersionCode;
  final String releaseNotes;
  final String playStoreUrl;

  AppReleaseInfo({
    required this.version,
    required this.versionCode,
    required this.downloadUrl,
    required this.minSupportedVersionCode,
    required this.releaseNotes,
    required this.playStoreUrl,
  });

  factory AppReleaseInfo.fromJson(Map<String, dynamic> json) {
    final relative = (json['download_url'] ?? '/api/public/apk/download/').toString();
    final absolute = relative.startsWith('http')
        ? relative
        : '${ApiConstants.appOrigin}${relative.startsWith('/') ? relative : '/$relative'}';
    return AppReleaseInfo(
      version: (json['version'] ?? '').toString(),
      versionCode: int.tryParse('${json['versionCode'] ?? 0}') ?? 0,
      downloadUrl: absolute,
      minSupportedVersionCode: int.tryParse('${json['min_supported_version_code'] ?? 0}') ?? 0,
      releaseNotes: (json['release_notes'] ?? '').toString(),
      playStoreUrl: (json['play_store_url'] ?? '').toString().trim(),
    );
  }
}

class AppUpdateService {
  AppUpdateService._();
  static final AppUpdateService instance = AppUpdateService._();

  Future<AppReleaseInfo?> fetchRemoteRelease() async {
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 12),
      ));
      final res = await dio.get(ApiConstants.apkVersionUrl);
      if (res.statusCode == 200 && res.data is Map) {
        return AppReleaseInfo.fromJson(Map<String, dynamic>.from(res.data as Map));
      }
    } catch (_) {}
    return null;
  }

  Future<void> checkAndPrompt(BuildContext context) async {
    final remote = await fetchRemoteRelease();
    if (remote == null || !context.mounted) return;

    final info = await PackageInfo.fromPlatform();
    final localCode = int.tryParse(info.buildNumber) ?? 0;
    if (remote.versionCode <= localCode) return;

    final forced = localCode < remote.minSupportedVersionCode;
    final notes = remote.releaseNotes.isNotEmpty
        ? remote.releaseNotes
        : 'Hay una nueva versión disponible (${remote.version}).';

    if (!context.mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: !forced,
      builder: (ctx) {
        return AlertDialog(
          title: Text(forced ? 'Actualización requerida' : 'Nueva versión disponible'),
          content: Text(
            '$notes\n\nVersión instalada: ${info.version} (${info.buildNumber})\n'
            'Nueva versión: ${remote.version} (${remote.versionCode})',
          ),
          actions: [
            if (!forced)
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Más tarde'),
              ),
            TextButton(
              onPressed: () async {
                Navigator.of(ctx).pop();
                await _startUpdate(context, remote);
              },
              child: const Text('Actualizar'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _startUpdate(BuildContext context, AppReleaseInfo remote) async {
    if (remote.playStoreUrl.isNotEmpty) {
      final uri = Uri.parse(remote.playStoreUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
    }

    if (!Platform.isAndroid) return;

    final installStatus = await Permission.requestInstallPackages.request();
    if (!installStatus.isGranted) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Se necesita permiso para instalar actualizaciones.')),
        );
      }
      await openAppSettings();
      return;
    }

    if (!context.mounted) return;
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const AlertDialog(
        content: Row(
          children: [
            CircularProgressIndicator(),
            SizedBox(width: 16),
            Expanded(child: Text('Descargando actualización…')),
          ],
        ),
      ),
    );

    try {
      final dir = await getTemporaryDirectory();
      final filePath = '${dir.path}/survey-app-update.apk';
      final dio = Dio();
      await dio.download(remote.downloadUrl, filePath);
      if (context.mounted) Navigator.of(context, rootNavigator: true).pop();
      final result = await OpenFilex.open(filePath, type: 'application/vnd.android.package-archive');
      if (result.type != ResultType.done && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo abrir el instalador: ${result.message}')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al descargar la actualización: $e')),
        );
      }
    }
  }
}
