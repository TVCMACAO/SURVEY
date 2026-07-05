import 'dart:convert';
import 'question.dart';

class Survey {
  final String id;
  final String? title;
  final List<dynamic>? questions;
  final Map<String, dynamic>? raw;

  Survey({
    required this.id,
    this.title,
    this.questions,
    this.raw,
  });

  factory Survey.fromJson(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? json['_id']?.toString() ?? '';
    return Survey(
      id: id,
      title: json['title']?.toString(),
      questions: json['questions'] is List ? List.from(json['questions']) : null,
      raw: Map<String, dynamic>.from(json),
    );
  }

  Map<String, dynamic> toJson() {
    return raw ?? {
      'id': id,
      'title': title,
      if (questions != null) 'questions': questions,
    };
  }

  String toJsonString() => jsonEncode(toJson());

  static Survey? fromJsonString(String? s) {
    if (s == null || s.isEmpty) return null;
    try {
      return Survey.fromJson(Map<String, dynamic>.from(jsonDecode(s)));
    } catch (_) {
      return null;
    }
  }

  List<Question> get parsedQuestions {
    if (questions == null) return [];
    return questions!
        .whereType<Map>()
        .map((q) => Question.fromJson(Map<String, dynamic>.from(q)))
        .toList();
  }

  List<Map<String, dynamic>> get sections {
    final s = raw?['sections'];
    if (s is! List) return [];
    return s.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  String? get referenceKeyColumn => raw?['reference_key_column']?.toString();

  Map<String, dynamic>? get referenceMapping {
    final m = raw?['reference_mapping'];
    if (m is Map) return Map<String, dynamic>.from(m);
    return null;
  }

  List<Map<String, dynamic>> get referenceData {
    final d = raw?['reference_data'];
    if (d is! List) return [];
    return d.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  String? get documentoEmpleadoQuestionId =>
      raw?['documento_empleado_question_id']?.toString();

  String? get documentoVotanteQuestionId =>
      raw?['documento_votante_question_id']?.toString();

  String? get description => raw?['description']?.toString();
}
