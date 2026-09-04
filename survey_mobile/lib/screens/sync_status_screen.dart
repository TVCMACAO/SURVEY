import 'package:flutter/material.dart';
import '../services/network_service.dart';
import '../services/sync_service.dart';
import '../utils/database_helper.dart';

class SyncStatusScreen extends StatefulWidget {
  const SyncStatusScreen({super.key});

  @override
  State<SyncStatusScreen> createState() => _SyncStatusScreenState();
}

class _SyncStatusScreenState extends State<SyncStatusScreen> {
  SyncState _state = SyncState();
  List<Map<String, dynamic>> _queueItems = [];
  bool _online = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    SyncService.instance.stateStream.listen((s) {
      if (mounted) setState(() => _state = s);
    });
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    _online = await NetworkService.instance.isConnected();
    _state = SyncService.instance.currentState;
    _queueItems = await DatabaseHelper.instance.getAllSyncQueueItems();
    final stats = await DatabaseHelper.instance.getSyncStats();
    _state = _state.copyWith(pendingCount: stats.pending);
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _syncNow() async {
    await SyncService.instance.syncPendingResponses();
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Estado de sincronización'),
        actions: [
          Icon(
            _online ? Icons.wifi : Icons.wifi_off,
            color: _online ? Colors.green : Colors.grey,
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _state.isSyncing ? 'Sincronizando...' : 'Resumen',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 12),
                          Text('Pendientes: ${_state.pendingCount}'),
                          if (_state.lastSyncAt != null)
                            Text(
                              'Última sync: ${_state.lastSyncAt!.toLocal()}',
                              style: TextStyle(color: Colors.grey[600], fontSize: 13),
                            ),
                          if (_state.lastError != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              _state.lastError!,
                              style: const TextStyle(color: Colors.red),
                            ),
                          ],
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: _state.isSyncing || !_online ? null : _syncNow,
                              icon: const Icon(Icons.sync),
                              label: const Text('Sincronizar ahora'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Cola de sincronización (${_queueItems.length})',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  if (_queueItems.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('No hay respuestas pendientes')),
                    )
                  else
                    ..._queueItems.map((item) {
                      final payload = item['payload'] as Map<String, dynamic>? ?? {};
                      return Card(
                        child: ListTile(
                          title: Text('Encuesta: ${payload['survey'] ?? '?'}'),
                          subtitle: Text('Local ID: ${item['local_id']}'),
                          trailing: const Icon(Icons.cloud_upload_outlined),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}
