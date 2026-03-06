import 'dart:convert';

class Survey {
  final String id;
  final String? title;
  final List<dynamic>? questions;
  final Map<String, dynamic>? raw; // resto del JSON del API

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

  /// Para guardar en BD (JSON string).
  String toJsonString() => jsonEncode(toJson());

  static Survey? fromJsonString(String? s) {
    if (s == null || s.isEmpty) return null;
    try {
      return Survey.fromJson(Map<String, dynamic>.from(jsonDecode(s)));
    } catch (_) {
      return null;
    }
  }
}
