import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download,
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  downloadExpenseTemplate,
  uploadExpenseFile,
  type UploadValidationError,
} from '@/lib/api';
import { format } from 'date-fns';

interface BulkUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkUpload({ isOpen, onClose, onSuccess }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<UploadValidationError[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const handleDownloadTemplate = async () => {
    try {
      await downloadExpenseTemplate(selectedYear, selectedMonth);
      toast.success(
        `Template for ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')} downloaded`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to download template';
      toast.error(message);
      console.error('Template download error:', err);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.csv')
    ) {
      toast.error('Please upload .xlsx or .csv file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setFile(file);
    setErrors([]);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadExpenseFile(file);

      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
        setShowErrorModal(true);
      } else {
        const parts: string[] = [];
        if (result.inserted > 0) parts.push(`${result.inserted} added`);
        if (result.updated > 0) parts.push(`${result.updated} updated`);
        if (result.deleted > 0) parts.push(`${result.deleted} deleted`);

        toast.success(parts.join(', ') || 'Upload successful');
        onSuccess?.();
        handleClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setErrors([]);
    setShowErrorModal(false);
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setErrors([]);
    setShowErrorModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      >
        <div
          className="w-full max-w-lg bg-card rounded-lg shadow-2xl border border-border/50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Bulk Upload Expenses</h2>
                <p className="text-sm text-muted-foreground">
                  Upload Excel or CSV file
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Select Month/Year for Template Data
              </label>
              <div className="flex gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-28 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for blank template, or select a month to download
                existing expenses
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full h-12 text-sm gap-2"
            >
              <Download className="h-4 w-4" />
              Download{' '}
              {format(
                new Date(selectedYear, selectedMonth - 1),
                'MMMM yyyy',
              )}{' '}
              Template
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium">Upload File</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                {file ? (
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Drag & drop or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports .xlsx and .csv files (max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {file && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-base font-medium gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload & Validate
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showErrorModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 backdrop-blur-sm"
          onClick={() => setShowErrorModal(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[80vh] bg-card rounded-lg shadow-2xl border border-border/50 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b bg-destructive/10">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-bold">Validation Errors</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowErrorModal(false)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left font-semibold px-3 py-2 w-20">
                        Row #
                      </th>
                      <th className="text-left font-semibold px-3 py-2 w-24">
                        Field
                      </th>
                      <th className="text-left font-semibold px-3 py-2 w-48">
                        Value
                      </th>
                      <th className="text-left font-semibold px-3 py-2">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((error, index) => (
                      <tr key={index} className="border-b border-border/40">
                        <td className="px-3 py-2">{error.rowNumber}</td>
                        <td className="px-3 py-2 capitalize font-medium">
                          {error.field}
                        </td>
                        <td
                          className="px-3 py-2 text-muted-foreground truncate max-w-[150px]"
                          title={error.value}
                        >
                          {error.value || '(empty)'}
                        </td>
                        <td className="px-3 py-2 text-destructive">
                          {error.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t bg-muted/10">
              <Button onClick={handleReset} className="w-full">
                Fix & Re-upload
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
