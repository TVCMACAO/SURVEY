import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:signature/signature.dart';
import '../models/question.dart';

typedef AnswersMap = Map<String, dynamic>;

class QuestionField extends StatefulWidget {
  final Question question;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;
  final Map<String, PendingFileRef> pendingFiles;
  final void Function(String questionId, PendingFileRef file)? onFileAdded;
  final void Function(String questionId, String pendingId)? onFileRemoved;

  const QuestionField({
    super.key,
    required this.question,
    required this.value,
    required this.onChanged,
    this.pendingFiles = const {},
    this.onFileAdded,
    this.onFileRemoved,
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
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(
          q.questionText,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
      );
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              q.questionText + (q.required ? ' *' : ''),
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
            if (q.description != null && q.description!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(q.description!, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
            ],
            const SizedBox(height: 12),
            _buildInput(context),
          ],
        ),
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
          decoration: const InputDecoration(border: OutlineInputBorder()),
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
          decoration: const InputDecoration(border: OutlineInputBorder()),
          onChanged: widget.onChanged,
        );
      case 'date':
        return ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(widget.value?.toString() ?? 'Seleccionar fecha'),
          trailing: const Icon(Icons.calendar_today),
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
        );
      case 'single_choice':
        return Column(
          children: q.options.map((opt) {
            return RadioListTile<String>(
              title: Text(opt),
              value: opt,
              groupValue: widget.value?.toString(),
              onChanged: (v) => widget.onChanged(v),
            );
          }).toList(),
        );
      case 'dropdown':
        return DropdownButtonFormField<String>(
          value: q.options.contains(widget.value?.toString()) ? widget.value?.toString() : null,
          decoration: const InputDecoration(border: OutlineInputBorder()),
          items: q.options.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: (v) => widget.onChanged(v),
        );
      case 'checkbox':
        final selected = widget.value is List
            ? (widget.value as List).map((e) => e.toString()).toSet()
            : <String>{};
        return Column(
          children: q.options.map((opt) {
            return CheckboxListTile(
              title: Text(opt),
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
              icon: Icon(star <= rating ? Icons.star : Icons.star_border, color: Colors.amber),
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
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Signature(
                controller: _signatureController!,
                backgroundColor: Colors.white,
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
              const Text('Firma guardada', style: TextStyle(color: Colors.green)),
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
              children: [
                OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Cámara'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo),
                  label: const Text('Galería'),
                ),
                OutlinedButton.icon(
                  onPressed: _pickFile,
                  icon: const Icon(Icons.attach_file),
                  label: const Text('Archivo'),
                ),
              ],
            ),
            ...refs.map((ref) => ListTile(
                  dense: true,
                  leading: const Icon(Icons.insert_drive_file),
                  title: Text(ref.displayName, overflow: TextOverflow.ellipsis),
                  trailing: IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => widget.onFileRemoved?.call(widget.question.id, ref.id),
                  ),
                )),
            if (ids.isNotEmpty && refs.isEmpty)
              Text('${ids.length} archivo(s) adjunto(s)', style: TextStyle(color: Colors.grey[600])),
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
          decoration: const InputDecoration(border: OutlineInputBorder()),
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
      return const Text('Tabla de evaluación sin configurar');
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
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
