"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { ImportUploadResponse } from "@/types";

export default function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportUploadResponse | null>(null);
  const [error, setError] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Только PDF файлы");
      return;
    }

    setError("");
    setResult(null);
    setUploading(true);
    try {
      const res = await api.uploadPdf(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Импорт выписки</h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-surface hover:border-primary/50"
        }`}
      >
        {uploading ? (
          <>
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted">Загрузка и обработка...</p>
          </>
        ) : (
          <>
            <Upload className="mb-4 h-10 w-10 text-muted" />
            <p className="text-lg font-medium">Перетащите PDF сюда</p>
            <p className="mt-1 text-sm text-muted">или нажмите для выбора файла</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleInputChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl bg-surface p-6 shadow-sm border border-border/50 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-income" />
            <h2 className="text-lg font-semibold">Импорт завершён</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoBlock icon={<FileText className="h-5 w-5" />} label="Файл" value={result.filename} />
            <InfoBlock label="Банк" value={result.bank} />
            <InfoBlock label="Создано" value={`${result.created} транзакций`} variant="income" />
            <InfoBlock label="Дубликаты" value={`${result.duplicates_skipped} пропущено`} variant={result.duplicates_skipped > 0 ? "warn" : "default"} />
          </div>

          {result.date_from && result.date_to && (
            <p className="text-sm text-muted">
              Период: {result.date_from} — {result.date_to}
            </p>
          )}
        </div>
      )}

      {/* Supported banks */}
      <div className="rounded-xl bg-surface p-5 shadow-sm border border-border/50">
        <h3 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wider">
          Поддерживаемые банки
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            "Kaspi", "Halyk", "Jusan", "BCC", "ForteBank", "Freedom",
            "Bereke", "VTB", "KICB", "Home Bank", "Сбер", "Альфа-Банк",
            "Райффайзен", "Евразийский", "Нурбанк", "RBK", "Qazpost", "Alatau",
          ].map((b) => (
            <span key={b} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-muted">
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  variant?: "default" | "income" | "warn";
}) {
  const color = variant === "income" ? "text-income" : variant === "warn" ? "text-amber-600" : "";
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 flex items-center gap-1.5 text-sm font-medium ${color}`}>
        {icon} {value}
      </p>
    </div>
  );
}
