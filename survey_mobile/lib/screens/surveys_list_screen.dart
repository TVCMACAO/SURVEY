import 'package:flutter/material.dart';
import '../models/survey.dart';
import '../services/auth_service.dart';
import '../services/network_service.dart';
import '../services/survey_service.dart';
import 'login_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _loadSurveys();
  }

  Future<void> _loadSurveys() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final hasNetwork = await NetworkService.instance.isConnected();
      if (hasNetwork) {
        await _surveyService.downloadSurveys();
      }
      final list = await _surveyService.getLocalSurveys();
      if (mounted) {
        setState(() {
          _surveys = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
          _surveys = [];
        });
      }
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Encuestas'),
        actions: [
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
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadSurveys,
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                )
              : _surveys.isEmpty
                  ? const Center(child: Text('No hay encuestas'))
                  : ListView.builder(
                      itemCount: _surveys.length,
                      itemBuilder: (context, i) {
                        final s = _surveys[i];
                        return ListTile(
                          title: Text(s.title ?? s.id),
                          subtitle: Text(s.id),
                        );
                      },
                    ),
    );
  }
}
