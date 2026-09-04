class Question {
  final String id;
  final String questionText;
  final String questionType;
  final List<String> options;
  final String? description;
  final bool required;
  final String? sectionId;
  final Map<String, dynamic>? conditionalLogic;
  final List<Map<String, dynamic>> evaluationItems;
  final List<Map<String, dynamic>> evaluationColumns;
  final bool dateIncludeTime;
  final String? accept;

  Question({
    required this.id,
    required this.questionText,
    required this.questionType,
    this.options = const [],
    this.description,
    this.required = false,
    this.sectionId,
    this.conditionalLogic,
    this.evaluationItems = const [],
    this.evaluationColumns = const [],
    this.dateIncludeTime = false,
    this.accept,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    final opts = json['options'];
    return Question(
      id: json['id']?.toString() ?? '',
      questionText: json['question_text']?.toString() ?? json['text']?.toString() ?? '',
      questionType: json['question_type']?.toString()
          ?? json['type']?.toString()
          ?? 'short_text',
      options: opts is List ? opts.map((e) => e.toString()).toList() : [],
      description: json['description']?.toString(),
      required: json['required'] == true,
      sectionId: json['section_id']?.toString(),
      conditionalLogic: json['conditional_logic'] is Map
          ? Map<String, dynamic>.from(json['conditional_logic'])
          : null,
      evaluationItems: json['evaluation_items'] is List
          ? (json['evaluation_items'] as List)
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList()
          : [],
      evaluationColumns: json['evaluation_columns'] is List
          ? (json['evaluation_columns'] as List)
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList()
          : [],
      dateIncludeTime: json['date_include_time'] == true,
      accept: json['accept']?.toString(),
    );
  }

  bool get isTitle => questionType == 'titulo';
}
