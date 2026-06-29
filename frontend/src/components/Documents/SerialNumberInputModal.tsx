import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface Props {
  isOpen: boolean;
  requiredCount: number;
  productSummary: string;
  onConfirm: (sns: string[]) => void;
  onCancel: () => void;
  darkMode: boolean;
}

interface FieldState {
  value: string;
  valid: boolean | null; // null = unchecked, true = valid, false = invalid
  error: string;
}

function makeFields(count: number): FieldState[] {
  return Array.from({ length: count }, () => ({ value: '', valid: null, error: '' }));
}

export default function SerialNumberInputModal({
  isOpen,
  requiredCount,
  productSummary,
  onConfirm,
  onCancel,
  darkMode,
}: Props) {
  const [fields, setFields] = useState<FieldState[]>(() => makeFields(requiredCount));
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const debounceTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>([]);

  // Reset fields whenever the modal opens or requiredCount changes
  useEffect(() => {
    if (isOpen) {
      setFields(makeFields(requiredCount));
      setSubmitError('');
      setIsSubmitting(false);
      debounceTimers.current.forEach((t) => t && clearTimeout(t));
      debounceTimers.current = Array(requiredCount).fill(null);
    }
  }, [isOpen, requiredCount]);

  // Auto-focus first empty field when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const firstEmpty = inputRefs.current.findIndex((el) => el && el.value === '');
        if (firstEmpty !== -1) inputRefs.current[firstEmpty]?.focus();
        else inputRefs.current[0]?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validateField = useCallback(async (index: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setFields((prev) => {
        const next = [...prev];
        next[index] = { value, valid: null, error: '' };
        return next;
      });
      return;
    }

    try {
      const res = await axios.get<{ valid: boolean; error?: string }>(
        `/api/serial-numbers/validate`,
        { params: { sn: trimmed } },
      );
      const { valid, error } = res.data;
      setFields((prev) => {
        const next = [...prev];
        next[index] = { value, valid: valid ? true : false, error: valid ? '' : (error ?? 'S/N ไม่ถูกต้อง') };
        return next;
      });
    } catch {
      setFields((prev) => {
        const next = [...prev];
        next[index] = { value, valid: false, error: 'ตรวจสอบ S/N ไม่ได้ — กรุณาลองใหม่' };
        return next;
      });
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    setSubmitError('');
    setFields((prev) => {
      const next = [...prev];
      next[index] = { value, valid: null, error: '' };
      return next;
    });

    // Debounce validation by 400 ms
    if (debounceTimers.current[index]) clearTimeout(debounceTimers.current[index]!);
    debounceTimers.current[index] = setTimeout(() => {
      void validateField(index, value);
    }, 400);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      // Move to next empty input, or next input in sequence
      const next = inputRefs.current.slice(index + 1).findIndex((el) => el && el.value === '');
      const target = next !== -1 ? index + 1 + next : index + 1;
      if (target < requiredCount) inputRefs.current[target]?.focus();
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    const values = fields.map((f) => f.value.trim());

    // Validate no blanks
    if (values.some((v) => !v)) {
      setSubmitError('กรุณากรอก Serial Number ทุกช่อง');
      return;
    }

    // Validate no duplicates within modal
    const unique = new Set(values);
    if (unique.size !== values.length) {
      setSubmitError('Serial Number ซ้ำกัน — กรุณาตรวจสอบ');
      return;
    }

    // Validate all fields passed server check
    const anyInvalid = fields.some((f) => f.valid === false);
    if (anyInvalid) {
      setSubmitError('Serial Number บางช่องไม่ผ่านการตรวจสอบ — กรุณาแก้ไข');
      return;
    }

    // If any field still unchecked (valid === null, value is set), wait / re-run validation
    const unchecked = fields.filter((f) => f.value.trim() && f.valid === null);
    if (unchecked.length > 0) {
      setIsSubmitting(true);
      try {
        await Promise.all(
          fields.map((f, i) => (f.value.trim() && f.valid === null ? validateField(i, f.value) : Promise.resolve()))
        );
      } finally {
        setIsSubmitting(false);
      }
      // Re-check after validation
      setFields((prev) => {
        const stillInvalid = prev.some((f) => f.valid === false);
        if (stillInvalid) setSubmitError('Serial Number บางช่องไม่ผ่านการตรวจสอบ — กรุณาแก้ไข');
        return prev;
      });
      return;
    }

    onConfirm(values);
  };

  if (!isOpen) return null;

  const bg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const headerBg = darkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-50 border-gray-200';
  const textMain = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBase = `w-full rounded-xl border px-3 py-2 text-sm font-mono outline-none transition focus:ring-2 focus:ring-orange-400 focus:border-orange-400`;
  const inputNeutral = darkMode
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const inputValid = darkMode ? 'border-green-500 bg-green-900/20 text-white' : 'border-green-500 bg-green-50 text-gray-900';
  const inputInvalid = darkMode ? 'border-red-500 bg-red-900/20 text-white' : 'border-red-500 bg-red-50 text-gray-900';

  const allFilledAndValid = fields.every((f) => f.value.trim() && f.valid === true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>

        {/* Header */}
        <div className={`flex items-center justify-between gap-4 px-6 py-4 border-b rounded-t-2xl ${headerBg}`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>กรอก Serial Number</p>
            <h3 className={`text-base font-bold mt-0.5 ${textMain}`}>
              ยืนยันชำระเงินเต็มจำนวน
            </h3>
            {productSummary && (
              <p className={`text-xs mt-0.5 ${textMuted}`}>{productSummary}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className={`rounded-lg p-1.5 transition ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
          <p className={`text-sm ${textMuted}`}>
            กรุณาสแกนหรือพิมพ์ Serial Number จำนวน <span className={`font-bold ${textMain}`}>{requiredCount}</span> รายการ
          </p>

          {fields.map((field, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold w-6 text-right shrink-0 ${textMuted}`}>{i + 1}.</span>
                <div className="relative flex-1">
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    value={field.value}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    placeholder={`S/N รายการที่ ${i + 1}`}
                    className={`${inputBase} ${
                      field.valid === true
                        ? inputValid
                        : field.valid === false
                        ? inputInvalid
                        : inputNeutral
                    }`}
                  />
                  {field.valid === true && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-base">✓</span>
                  )}
                  {field.valid === false && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold text-base">✗</span>
                  )}
                </div>
              </div>
              {field.error && (
                <p className="ml-8 mt-1 text-xs text-red-500">{field.error}</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t rounded-b-2xl ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {submitError && (
            <p className="mb-3 text-sm text-red-500 font-medium">{submitError}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => { void handleSubmit(); }}
              disabled={isSubmitting || !allFilledAndValid}
              className={`rounded-xl px-5 py-2 text-sm font-semibold text-white transition ${
                isSubmitting || !allFilledAndValid
                  ? 'bg-green-400 cursor-not-allowed opacity-60'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSubmitting ? 'กำลังตรวจสอบ...' : 'ยืนยันชำระ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
