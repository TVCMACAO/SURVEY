import 'package:flutter/material.dart';
import '../models/survey.dart';
import '../services/auth_service.dart';
import '../services/network_service.dart';
import '../services/survey_service.dart';
import '../services/sync_service.dart';
import '../utils/database_helper.dart';
import 'login_screen.dart';
import 'response_form_screen.dart';
import 'sync_status_screen.dart';

class SurveysListScreen extends StatefulWidget {
  const SurveysListScreen({super.key});

  @override
  State<SurveysListScreen> createState() => _SurveysListScreenState();
}

class _SurveysListScreenState extends State<SurveysListScreen> {
  final SurveyService _surveyService = SurveyService.instance;
  final AuthService _auth = AuthService.instance;
  List<Survey> _surveys = [];
  bool _loading = true;
  String? _error;
  bool _online = false;
  int _pendingSync = 0;

  @override
  void initState() {
    super.initState();
    SyncService.instance.init();
    _loadSurveys();
    SyncService.instance.stateStream.listen((s) {
      if (mounted) setState(() => _pendingSync = s.pendingCount);
    });
  }

  Future<void> _loadSurveys() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _online = await NetworkService.instance.isConnected();
      if (_online) {
        await _surveyService.downloadSurveys();
        await SyncService.instance.trySyncNow();
      }
      final list = await _surveyService.getLocalSurveys();
      final stats = await DatabaseHelper.instance.getSyncStats();
      if (mounted) {
        setState(() {
          _surveys = list;
          _loading = false;
          _pendingSync = stats.pending;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _openSurvey(Survey survey) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ResponseFormScreen(survey: survey)),
    );
    if (result == true) {
      final stats = await DatabaseHelper.instance.getSyncStats();
      if (mounted) setState(() => _pendingSync = stats.pending);
    }
  }

  Future<void> _logout() async {
    await _auth.logout();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final useGrid = width >= 600;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Encuestas'),
        actions: [
          IconButton(
            icon: Icon(_online ? Icons.cloud_done : Icons.cloud_off, color: _online ? Colors.green : Colors.grey),
            onPressed: null,
            tooltip: _online ? 'En línea' : 'Sin conexión',
          ),
          if (_pendingSync > 0)
            TextButton.icon(
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SyncStatusScreen()),
                );
                await _loadSurveys();
              },
              icon: Badge(
                label: Text('$_pendingSync'),
                child: const Icon(Icons.sync),
              ),
              label: const Text('Pendientes'),
            )
          else
            IconButton(
              icon: const Icon(Icons.sync),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SyncStatusScreen()),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _loadSurveys,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _loadSurveys, child: const Text('Reintentar')),
                      ],
                    ),
                  ),
                )
              : _surveys.isEmpty
                  ? const Center(child: Text('No hay encuestas'))
                  : useGrid
                      ? GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: width >= 900 ? 3 : 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 1.4,
                          ),
                          itemCount: _surveys.length,
                          itemBuilder: (context, i) => _SurveyCard(
                            survey: _surveys[i],
                            onTap: () => _openSurvey(_surveys[i]),
                          ),
                        )
                      : ListView.builder(
                          itemCount: _surveys.length,
                          itemBuilder: (context, i) => _SurveyCard(
                            survey: _surveys[i],
                            onTap: () => _openSurvey(_surveys[i]),
                          ),
                        ),
    );
  }
}

class _SurveyCard extends StatelessWidget {
  final Survey survey;
  final VoidCallback onTap;

  const _SurveyCard({required this.survey, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                survey.title ?? survey.id,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Text(
                '${survey.parsedQuestions.length} preguntas',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const Spacer(),
              const Align(
                alignment: Alignment.bottomRight,
                child: Icon(Icons.arrow_forward_ios, size: 16),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
