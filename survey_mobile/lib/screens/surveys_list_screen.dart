import 'package:flutter/material.dart';
import '../models/survey.dart';
import '../services/auth_service.dart';
import '../services/app_update_service.dart';
import '../services/network_service.dart';
import '../services/survey_service.dart';
import '../services/sync_service.dart';
import '../theme/app_theme.dart';
import '../utils/database_helper.dart';
import '../widgets/app_atmosphere.dart';
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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        AppUpdateService.instance.checkAndPrompt(context);
      }
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

  Future<void> _openSync() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const SyncStatusScreen()),
    );
    await _loadSurveys();
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final topInset = MediaQuery.paddingOf(context).top;
    final useGrid = width >= 600;
    final crossAxisCount = width >= 900 ? 3 : 2;

    return AtmosphereScaffold(
      appBar: GlassHeader(
        height: 56,
        topInset: topInset,
        child: Row(
          children: [
            const Expanded(
              child: Text(
                'Encuestas',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            Icon(
              _online ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
              color: _online ? const Color(0xFF059669) : AppColors.textMuted,
              size: 22,
            ),
            const SizedBox(width: 4),
            IconButton(
              tooltip: 'Sincronización',
              onPressed: _openSync,
              icon: _pendingSync > 0
                  ? Badge(
                      label: Text('$_pendingSync'),
                      child: const Icon(Icons.sync_rounded),
                    )
                  : const Icon(Icons.sync_rounded),
            ),
            IconButton(
              tooltip: 'Actualizar',
              onPressed: _loading ? null : _loadSurveys,
              icon: const Icon(Icons.refresh_rounded),
            ),
            IconButton(
              tooltip: 'Cerrar sesión',
              onPressed: _logout,
              icon: const Icon(Icons.logout_rounded),
            ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: GlassPanel(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadSurveys,
                            child: const Text('Reintentar'),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : _surveys.isEmpty
                  ? Center(
                      child: GlassPanel(
                        margin: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.inbox_outlined, size: 40, color: Colors.grey[400]),
                            const SizedBox(height: 12),
                            const Text(
                              'No hay encuestas',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : useGrid
                      ? GridView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: crossAxisCount,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: crossAxisCount >= 3 ? 2.8 : 2.7,
                          ),
                          itemCount: _surveys.length,
                          itemBuilder: (context, i) => _SurveyCard(
                            survey: _surveys[i],
                            onTap: () => _openSurvey(_surveys[i]),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                          itemCount: _surveys.length,
                          itemBuilder: (context, i) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _SurveyCard(
                              survey: _surveys[i],
                              onTap: () => _openSurvey(_surveys[i]),
                            ),
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
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: GlassPanel(
          showSideBar: true,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      survey.title ?? survey.id,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                        height: 1.25,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${survey.parsedQuestions.length} preguntas',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.chevron_right_rounded, color: Colors.grey[400], size: 22),
            ],
          ),
        ),
      ),
    );
  }
}
