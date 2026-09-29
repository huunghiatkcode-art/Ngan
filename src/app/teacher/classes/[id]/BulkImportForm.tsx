"use client";
import { useRef, useState } from "react";
import { bulkImportStudentsAction } from "../actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { Upload } from "lucide-react";

interface Row { full_name: string; username: string; student_code: string }

function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  const [header, ...rest] = lines;
  const cols = header.split(",").map((c) => c.trim().toLowerCase());
  const idx = { full_name: cols.indexOf("full_name"), username: cols.indexOf("username"), student_code: cols.indexOf("student_code") };
  return rest.filter(Boolean).map((line) => {
    const parts = line.split(",");
    return { full_name: parts[idx.full_name]?.trim() ?? "", username: parts[idx.username]?.trim() ?? "", student_code: parts[idx.student_code]?.trim() ?? "" };
  });
}

export default function BulkImportForm({ classId }: { classId: string }) {
  const [pending, setPending] = useState(false);
  const [pins, setPins] = useState<{ username: string; pin: string }[]>([]);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = async (file: File) => {
    setPending(true);
    setPins([]);
    setErrors([]);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const { result, createdPins } = await bulkImportStudentsAction(classId, rows);
      setPins(createdPins);
      setErrors(result.errors);
      toast.show(`Đã tạo ${result.created} học sinh.`, result.errors.length ? "info" : "success");
    } catch {
      toast.show("Import thất bại. Kiểm tra định dạng file CSV.", "error");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card className="p-4">
      <h2 className="font-semibold text-sm mb-1">Import CSV hàng loạt</h2>
      <p className="text-xs text-[var(--muted)] mb-3">Cột bắt buộc: full_name, username, student_code. PIN 4 số sẽ được tạo ngẫu nhiên.</p>
      <label className="btn btn-secondary cursor-pointer w-full justify-center">
        <Upload size={14} /> {pending ? "Đang import..." : "Chọn file .csv"}
        <input ref={inputRef} type="file" accept=".csv" className="hidden" disabled={pending} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </label>

      {pins.length > 0 && (
        <div className="mt-3 text-xs bg-green-50 rounded-lg p-2 max-h-32 overflow-auto">
          {pins.map((p) => <div key={p.username}>{p.username}: <strong>{p.pin}</strong></div>)}
        </div>
      )}
      {errors.length > 0 && (
        <div className="mt-2 text-xs bg-red-50 rounded-lg p-2 max-h-32 overflow-auto text-[var(--color-danger)]">
          {errors.map((e, i) => <div key={i}>Dòng {e.row}: {e.message}</div>)}
        </div>
      )}
    </Card>
  );
}
