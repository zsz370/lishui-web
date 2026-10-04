"""Read-only inventory and text extraction; never changes source documents."""
from pathlib import Path
from collections import Counter
import hashlib, json, re
from docx import Document
from openpyxl import load_workbook
from pypdf import PdfReader

root = Path(__file__).resolve().parents[2]
source_root = root / '03_原始资料'
out = root / 'lishui-web' / 'docs' / 'corpus-audit'
out.mkdir(parents=True, exist_ok=True)
records, errors, qa, mismatches = [], [], [], []
folders = ['数据包资源', '南京溧水文旅_知识库', '南京溧水文旅_知识文档']
for folder in folders:
    for path in sorted((source_root / folder).rglob('*')):
        if path.suffix.lower() not in {'.docx', '.xlsx', '.pdf'} or path.name.startswith('~$'):
            continue
        rec = {'path': path.relative_to(root).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        try:
            if path.suffix == '.docx':
                doc = Document(path)
                parts = [p.text for p in doc.paragraphs]
                parts += [' | '.join(c.text for c in row.cells) for table in doc.tables for row in table.rows]
                rec['text'] = '\n'.join(parts)
                rec['urls'] = re.findall(r'https?://[^\s<>]+', rec['text'])
                rec['urls'] += [rel.target_ref for rel in doc.part.rels.values() if rel.reltype.endswith('/hyperlink')]
            elif path.suffix == '.xlsx':
                wb = load_workbook(path, data_only=False, read_only=True)
                sheets = {s.title: [list(r) for r in s.iter_rows(values_only=True)] for s in wb}
                rec['sheets'] = sheets
                rec['text'] = '\n'.join(' | '.join(str(c or '') for c in row) for rows in sheets.values() for row in rows)
                if 'QA_15条' in path.parts:
                    for sheet, rows in sheets.items():
                        for i, row in enumerate(rows[1:], 2):
                            if any(c is not None for c in row):
                                qa.append({'path': rec['path'], 'sheet': sheet, 'row': i, 'cells': row})
                wb.close()
            else:
                pdf = PdfReader(path)
                rec['pages'] = len(pdf.pages)
                rec['text'] = '\n'.join(p.extract_text() or '' for p in pdf.pages)
            rec['chars'] = len(rec['text'].strip())
        except Exception as exc:
            errors.append({'path': rec['path'], 'error': str(exc)})
        records.append(rec)
data_prefix = '03_原始资料/数据包资源/'
upload_folder = source_root / '数据包资源' / '上传就绪'
for rec in records if upload_folder.exists() else []:
    path = rec['path']
    if path.startswith(data_prefix + '文档_8篇/'):
        rel = path.removeprefix(data_prefix + '文档_8篇/')
        role, name = rel.split('/', 1)
        target = data_prefix + '上传就绪/' + role + '/文档/' + name
    elif path.startswith(data_prefix + 'QA_15条/'):
        name = Path(path).name
        candidates = [r for r in records if '/上传就绪/' in r['path'] and r['path'].endswith('/QA/' + name)]
        target = candidates[0]['path'] if len(candidates) == 1 else ''
    else:
        continue
    pair = next((r for r in records if r['path'] == target), None)
    if pair is None or pair['sha256'] != rec['sha256']:
        mismatches.append({'source': path, 'target': target, 'missing': pair is None})
summary = {
    'auditDate': '2026-10-04',
    'sourceRoot': '03_原始资料',
    'counts': dict(Counter('/'.join(r['path'].split('/')[:3]) for r in records)),
    'files': len(records), 'errors': errors, 'empty': [r['path'] for r in records if not r.get('chars')],
    'qaNonemptyRows': len(qa),
    'qaIncompleteRows': [r for r in qa if len(r['cells']) < 2 or not r['cells'][0] or not r['cells'][1]],
    'uploadMismatches': mismatches,
    'uploadMirrorStatus': 'checked' if upload_folder.exists() else 'removed_verified_duplicates_2026-10-04',
    'docxWithExternalLinks': sum(bool(r.get('urls')) for r in records if r['path'].endswith('.docx')),
}
(out / 'inventory.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
(out / 'extracted.json').write_text(json.dumps(records, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
(out / 'qa-rows.json').write_text(json.dumps(qa, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))
