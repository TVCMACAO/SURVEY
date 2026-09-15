import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:signature/signature.dart';
import '../models/question.dart';
import '../theme/app_theme.dart';
import 'app_atmosphere.dart';

typedef AnswersMap = Map<String, dynamic>;

class QuestionField extends StatefulWidget {
  final Question question;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;
  final Map<String, PendingFileRef> pendingFiles;
  final void Function(String questionId, PendingFileRef file)? onFileAdded;
  final void Function(String questionId, String pendingId)? onFileRemoved;
  final int? index;
  final Color? cardColor;
  final Color? numberColor;
  final Color? numberTextColor;

  const QuestionField({
    super.key,
    required this.question,
    required this.value,
    required this.onChanged,
    this.pendingFiles = const {},
    this.onFileAdded,
    this.onFileRemoved,
    this.index,
    this.cardColor,
    this.numberColor,
    this.numberTextColor,
  });

  @override
  State<QuestionField> createState() => _QuestionFieldState();
}

class PendingFileRef {
  final String id;
  final String localPath;
  final String mimeType;
  final String displayName;

  PendingFileRef({
    required this.id,
    required this.localPath,
    required this.mimeType,
    required this.displayName,
  });
}

class _QuestionFieldState extends State<QuestionField> {
  final ImagePicker _picker = ImagePicker();
  SignatureController? _signatureController;

  @override
  void dispose() {
    _signatureController?.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final x = await _picker.pickImage(source: source, imageQuality: 85);
    if (x == null) return;
    widget.onFileAdded?.call(
      widget.question.id,
      PendingFileRef(
        id: 'pf_${DateTime.now().millisecondsSinceEpoch}',
        localPath: x.path,
        mimeType: 'image/jpeg',
        displayName: x.name,
      ),
    );
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'],
    );
    if (result == null || result.files.isEmpty) return;
    final f = result.files.first;
    if (f.path == null) return;
    widget.onFileAdded?.call(
      widget.question.id,
      PendingFileRef(
        id: 'pf_${DateTime.now().millisecondsSinceEpoch}',
        localPath: f.path!,
        mimeType: f.extension != null ? 'application/${f.extension}' : 'application/octet-stream',
        displayName: f.name,
      ),
    );
  }

  List<String> _fileListValue() {
    if (widget.value is List) {
      return (widget.value as List).map((e) => e.toString()).toList();
    }
    return [];
  }

  @override
  Widget build(BuildContext context) {
    final q = widget.question;
    if (q.isTitle) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(4, 8, 4, 12),
        child: Text(
          q.questionText,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            height: 1.3,
          ),
        ),
      );
    }

    final numberBg = widget.numberColor ?? AppColors.indigo;
    final numberFg = widget.numberTextColor ?? Colors.white;
    final displayIndex = (widget.index ?? 0) + 1;

    return GlassPanel(
      margin: const EdgeInsets.only(bottom: 12),
      color: widget.cardColor ?? AppColors.glassWhite,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: numberBg,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: numberBg.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Text(
                  '$displayIndex',
                  style: TextStyle(
                    color: numberFg,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      q.questionText + (q.required ? ' *' : ''),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                        height: 1.3,
                      ),
                    ),
                    if (q.description != null && q.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        q.description!,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildInput(context),
        ],
      ),
    );
  }

  Widget _buildInput(BuildContext context) {
    final q = widget.question;
    switch (q.questionType) {
      case 'long_text':
        return TextFormField(
          initialValue: widget.value?.toString() ?? '',
          maxLines: 4,
          decoration: const InputDecoration(hintText: 'Escribe tu respuesta…'),
          onChanged: widget.onChanged,
        );
      case 'email':
      case 'number':
      case 'short_text':
        return TextFormField(
          initialValue: widget.value?.toString() ?? '',
          keyboardType: q.questionType == 'number'
              ? TextInputType.number
              : q.questionType == 'email'
                  ? TextInputType.emailAddress
                  : TextInputType.text,
          decoration: InputDecoration(
            hintText: q.questionType == 'email'
                ? 'correo@ejemplo.com'
                : q.questionType == 'number'
                    ? 'Número'
                    : 'Escribe tu respuesta…',
          ),
          onChanged: widget.onChanged,
        );
      case 'date':
        return InkWell(
          onTap: () async {
            if (q.dateIncludeTime) {
              final d = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(1900),
                lastDate: DateTime(2100),
              );
              if (d == null || !context.mounted) return;
              final t = await showTimePicker(
                context: context,
                initialTime: TimeOfDay.now(),
              );
              if (t == null) return;
              final dt = DateTime(d.year, d.month, d.day, t.hour, t.minute);
              widget.onChanged(dt.toIso8601String().substring(0, 16));
            } else {
              final d = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(1900),
                lastDate: DateTime(2100),
              );
              if (d != null) {
                widget.onChanged(
                  '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}',
                );
              }
            }
          },
          borderRadius: BorderRadius.circular(12),
          child: InputDecorator(
            decoration: const InputDecoration(
              suffixIcon: Icon(Icons.calendar_today_rounded, size: 18),
            ),
            child: Text(
              widget.value?.toString().isNotEmpty == true
                  ? widget.value.toString()
                  : (q.dateIncludeTime ? 'Seleccionar fecha y hora' : 'Seleccionar fecha'),
              style: TextStyle(
                color: widget.value?.toString().isNotEmpty == true
                    ? AppColors.textPrimary
                    : AppColors.textMuted,
              ),
            ),
          ),
        );
      case 'single_choice':
        return Column(
          children: q.options.map((opt) {
            return RadioListTile<String>(
              dense: true,
              visualDensity: VisualDensity.compact,
              contentPadding: EdgeInsets.zero,
              title: Text(opt, style: const TextStyle(fontSize: 14)),
              value: opt,
              groupValue: widget.value?.toString(),
              onChanged: (v) => widget.onChanged(v),
            );
          }).toList(),
        );
      case 'dropdown':
        return DropdownButtonFormField<String>(
          value: q.options.contains(widget.value?.toString()) ? widget.value?.toString() : null,
          isExpanded: true,
          decoration: const InputDecoration(hintText: 'Seleccionar…'),
          items: q.options.map((o) => DropdownMenuItem(value: o, child: Text(o, overflow: TextOverflow.ellipsis))).toList(),
          onChanged: (v) => widget.onChanged(v),
        );
      case 'checkbox':
        final selected = widget.value is List
            ? (widget.value as List).map((e) => e.toString()).toSet()
            : <String>{};
        return Column(
          children: q.options.map((opt) {
            return CheckboxListTile(
              dense: true,
              visualDensity: VisualDensity.compact,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: Text(opt, style: const TextStyle(fontSize: 14)),
              value: selected.contains(opt),
              onChanged: (checked) {
                final next = Set<String>.from(selected);
                if (checked == true) {
                  next.add(opt);
                } else {
                  next.remove(opt);
                }
                widget.onChanged(next.toList());
              },
            );
          }).toList(),
        );
      case 'rating':
        final rating = widget.value is num ? (widget.value as num).toInt() : 0;
        return Row(
          children: List.generate(5, (i) {
            final star = i + 1;
            return IconButton(
              visualDensity: VisualDensity.compact,
              icon: Icon(
                star <= rating ? Icons.star_rounded : Icons.star_border_rounded,
                color: const Color(0xFFF59E0B),
              ),
              onPressed: () => widget.onChanged(star),
            );
          }),
        );
      case 'signature':
        _signatureController ??= SignatureController(
          penStrokeWidth: 2,
          penColor: Colors.black,
          exportBackgroundColor: Colors.white,
        );
        return Column(
          children: [
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: const Color(0xFFE2E8F0)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Signature(
                  controller: _signatureController!,
                  backgroundColor: Colors.white,
                ),
              ),
            ),
            Row(
              children: [
                TextButton(
                  onPressed: () => _signatureController!.clear(),
                  child: const Text('Limpiar'),
                ),
                TextButton(
                  onPressed: () async {
                    if (_signatureController!.isEmpty) return;
                    final bytes = await _signatureController!.toPngBytes();
                    if (bytes == null) return;
                    final b64 = Uri.dataFromBytes(bytes, mimeType: 'image/png').toString();
                    widget.onChanged(b64);
                  },
                  child: const Text('Guardar firma'),
                ),
              ],
            ),
            if (widget.value != null && widget.value.toString().startsWith('data:'))
              const Text('Firma guardada', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.w600)),
          ],
        );
      case 'file_upload':
        final refs = widget.pendingFiles.values.toList();
        final ids = _fileListValue();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_rounded, size: 18),
                  label: const Text('Cámara'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_rounded, size: 18),
                  label: const Text('Galería'),
                ),
                OutlinedButton.icon(
                  onPressed: _pickFile,
                  icon: const Icon(Icons.attach_file_rounded, size: 18),
                  label: const Text('Archivo'),
                ),
              ],
            ),
            ...refs.map((ref) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.insert_drive_file_rounded, color: AppColors.indigo),
                  title: Text(ref.displayName, overflow: TextOverflow.ellipsis),
                  trailing: IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => widget.onFileRemoved?.call(widget.question.id, ref.id),
                  ),
                )),
            if (ids.isNotEmpty && refs.isEmpty)
              Text('${ids.length} archivo(s) adjunto(s)', style: const TextStyle(color: AppColors.textMuted)),
          ],
        );
      case 'evaluation_table':
        return _EvaluationTableField(
          question: q,
          value: widget.value is Map ? Map<String, dynamic>.from(widget.value as Map) : {},
          onChanged: widget.onChanged,
        );
      default:
        return TextFormField(
          initialValue: widget.value?.toString() ?? '',
          decoration: const InputDecoration(hintText: 'Escribe tu respuesta…'),
          onChanged: widget.onChanged,
        );
    }
  }
}

class _EvaluationTableField extends StatelessWidget {
  final Question question;
  final Map<String, dynamic> value;
  final ValueChanged<dynamic> onChanged;

  const _EvaluationTableField({
    required this.question,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final items = question.evaluationItems;
    final cols = question.evaluationColumns;
    if (items.isEmpty || cols.isEmpty) {
      return const Text('Tabla de evaluación sin configurar', style: TextStyle(color: AppColors.textMuted));
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowHeight: 40,
        dataRowMinHeight: 40,
        dataRowMaxHeight: 56,
        columns: [
          const DataColumn(label: Text('Ítem')),
          ...cols.map((c) => DataColumn(label: Text(c['label']?.toString() ?? ''))),
        ],
        rows: items.map((item) {
          final itemId = item['id']?.toString() ?? '';
          final rowData = value[itemId] is Map
              ? Map<String, dynamic>.from(value[itemId] as Map)
              : <String, dynamic>{};
          return DataRow(
            cells: [
              DataCell(Text(item['label']?.toString() ?? itemId)),
              ...cols.map((col) {
                final colId = col['id']?.toString() ?? '';
                final inputType = col['inputType']?.toString() ?? 'text';
                final cellVal = rowData[colId];
                if (inputType == 'checkbox') {
                  return DataCell(Checkbox(
                    value: cellVal == true,
                    onChanged: (v) {
                      final next = Map<String, dynamic>.from(value);
                      final row = Map<String, dynamic>.from(rowData);
                      row[colId] = v ?? false;
                      next[itemId] = row;
                      onChanged(next);
                    },
                  ));
                }
                return DataCell(SizedBox(
                  width: 120,
                  child: TextFormField(
                    initialValue: cellVal?.toString() ?? '',
                    decoration: const InputDecoration(isDense: true),
                    onChanged: (v) {
                      final next = Map<String, dynamic>.from(value);
                      final row = Map<String, dynamic>.from(rowData);
                      row[colId] = v;
                      next[itemId] = row;
                      onChanged(next);
                    },
                  ),
                ));
              }),
            ],
          );
        }).toList(),
      ),
    );
  }
}
