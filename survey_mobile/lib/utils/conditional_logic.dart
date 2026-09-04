bool evaluateCondition(Map<String, dynamic>? condition, Map<String, dynamic> answers) {
  if (condition == null || condition['question_id'] == null) return true;

  final questionId = condition['question_id'].toString();
  final answer = answers[questionId];
  final operator = condition['operator']?.toString() ?? 'equals';
  final value = condition['value'];

  if (answer == null || answer == '') return false;

  if (answer is List) {
    if (answer.isEmpty) return false;
    final valStr = value?.toString() ?? '';
    switch (operator) {
      case 'equals':
        return answer.any((a) => a.toString() == valStr);
      case 'not_equals':
        return answer.every((a) => a.toString() != valStr);
      case 'contains':
        final lower = valStr.toLowerCase();
        return answer.any((a) => a.toString().toLowerCase().contains(lower));
      default:
        return answer.any((a) => a.toString() == valStr);
    }
  }

  switch (operator) {
    case 'equals':
      return answer.toString() == value.toString();
    case 'not_equals':
      return answer.toString() != value.toString();
    case 'contains':
      return answer.toString().toLowerCase().contains(value.toString().toLowerCase());
    case 'greater_than':
      return num.tryParse(answer.toString()) != null &&
          num.parse(answer.toString()) > num.parse(value.toString());
    case 'less_than':
      return num.tryParse(answer.toString()) != null &&
          num.parse(answer.toString()) < num.parse(value.toString());
    case 'greater_than_or_equal':
      return num.tryParse(answer.toString()) != null &&
          num.parse(answer.toString()) >= num.parse(value.toString());
    case 'less_than_or_equal':
      return num.tryParse(answer.toString()) != null &&
          num.parse(answer.toString()) <= num.parse(value.toString());
    default:
      return true;
  }
}

bool isQuestionVisible(Map<String, dynamic>? conditionalLogic, Map<String, dynamic> answers) {
  if (conditionalLogic == null) return true;
  return evaluateCondition(conditionalLogic, answers);
}
