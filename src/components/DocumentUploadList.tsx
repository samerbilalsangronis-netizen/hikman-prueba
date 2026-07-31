import { useState } from 'react';
import { useMacroData } from '../data/MacroDataContext';
import type { DocumentEntry } from '../types';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface DocumentUploadListProps {
  title: string;
  description: string;
  entries: DocumentEntry[];
  onAdd: (entry: Omit<DocumentEntry, 'id' | 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DocumentUploadList({ title, description, entries, onAdd, onDelete }: DocumentUploadListProps) {
  const { uploadDocumentFile, syncMode } = useMacroData();
  const [open, setOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!docTitle.trim() || (!text.trim() && !file)) return;
    setSaving(true);
    setError(null);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      if (file) {
        const uploaded = await uploadDocumentFile(file);
        fileUrl = uploaded.url;
        fileName = uploaded.name;
      }
      await onAdd({ title: docTitle.trim(), text: text.trim() || undefined, fileUrl, fileName });
      setDocTitle('');
      setText('');
      setFile(null);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>

      {open ? (
        <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Título"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="rounded-md px-2.5 py-1.5 text-sm"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <textarea
            placeholder="Texto (opcional si subís un archivo)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="resize-none rounded-md px-2.5 py-1.5 text-sm"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={syncMode !== 'cloud'}
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          />
          {syncMode !== 'cloud' && (
            <p className="text-[11px]" style={{ color: 'var(--status-warning)' }}>
              La carga de archivos necesita Supabase configurado — por ahora solo podés guardar texto.
            </p>
          )}
          {error && <p className="text-xs" style={{ color: 'var(--delta-bad)' }}>{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving || !docTitle.trim() || (!text.trim() && !file)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--series-1)' }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="self-start rounded-md px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: 'var(--series-2)' }}
        >
          + Agregar
        </button>
      )}

      <div className="flex flex-col gap-1.5">
        {entries.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Nada cargado todavía.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-2 rounded-md p-2" style={{ border: '1px solid var(--border)' }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {entry.title}
                  </span>
                  <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                {entry.text && (
                  <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {entry.text}
                  </p>
                )}
                {entry.fileUrl && (
                  <a href={entry.fileUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-xs underline" style={{ color: 'var(--series-1)' }}>
                    📄 {entry.fileName ?? 'Ver archivo'} ↗
                  </a>
                )}
              </div>
              <button onClick={() => onDelete(entry.id)} className="shrink-0 text-xs" style={{ color: 'var(--delta-bad)' }}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
