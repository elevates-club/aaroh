import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CSVUploadDialogProps {
  onStudentsAdded?: () => void;
  trigger?: React.ReactNode;
}

interface CSVStudent {
  name: string;
  roll_number: string;
  department: string;
  year: 'first' | 'second' | 'third' | 'fourth';
}

interface UploadResult {
  success: number;
  errors: Array<{ row: number; error: string; data: CSVStudent }>;
}

export function CSVUploadDialog({ onStudentsAdded, trigger }: CSVUploadDialogProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [csvData, setCsvData] = useState<CSVStudent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultTrigger = (
    <Button variant="outline" className="w-full sm:w-auto min-w-0">
      <Upload className="mr-2 h-4 w-4 flex-shrink-0" />
      <span className="hidden xs:inline truncate">Bulk Upload CSV</span>
      <span className="xs:hidden truncate">CSV Upload</span>
    </Button>
  );

  const downloadTemplate = () => {
    const template = [
      ['name', 'roll_number', 'department', 'year'],
      ['John Doe', 'CS2021001', 'Computer Science', 'first'],
      ['Jane Smith', 'EE2021002', 'Electrical Engineering', 'second'],
      ['Bob Johnson', 'ME2021003', 'Mechanical Engineering', 'third'],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText: string): CSVStudent[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const students: CSVStudent[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header row
      const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));

      if (columns.length >= 4) {
        const year = columns[3].toLowerCase();
        if (['first', 'second', 'third', 'fourth'].includes(year)) {
          students.push({
            name: columns[0],
            roll_number: columns[1].toUpperCase(),
            department: columns[2],
            year: year as 'first' | 'second' | 'third' | 'fourth',
          });
        }
      }
    }

    return students;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      try {
        const parsedData = parseCSV(csvText);
        setCsvData(parsedData);
        setUploadResult(null);
      } catch (error) {
        toast({
          title: 'Parse Error',
          description: 'Failed to parse CSV file. Please check the format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const uploadStudents = async () => {
    if (csvData.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const result: UploadResult = {
      success: 0,
      errors: [],
    };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const student = csvData[i];

        try {
          const { error } = await supabase
            .from('students')
            .insert([student]);

          if (error) {
            if (error.code === '23505') {
              result.errors.push({
                row: i + 2, // +2 because we skip header and arrays are 0-indexed
                error: 'Roll number already exists',
                data: student,
              });
            } else {
              result.errors.push({
                row: i + 2,
                error: error.message || 'Unknown error',
                data: student,
              });
            }
          } else {
            result.success++;
          }
        } catch (err) {
          result.errors.push({
            row: i + 2,
            error: 'Unexpected error',
            data: student,
          });
        }

        setUploadProgress(Math.round(((i + 1) / csvData.length) * 100));
      }

      // Log activity
      if (result.success > 0) {
        await supabase.from('activity_logs').insert([
          {
            user_id: profile?.id,
            action: 'students_bulk_uploaded',
            details: {
              total_uploaded: result.success,
              total_errors: result.errors.length,
              errors: result.errors,
            },
          },
        ]);
      }

      setUploadResult(result);

      if (result.success > 0) {
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded ${result.success} students`,
        });
        onStudentsAdded?.();
      }

    } catch (error) {
      console.error('Bulk upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'An unexpected error occurred during upload',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setCsvData([]);
    setUploadResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Bulk Upload Students</DialogTitle>
          <DialogDescription>
            Upload multiple students using a CSV file
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[95vh] p-3 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Bulk Upload Students</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Upload multiple students at once using a CSV file
              </p>
            </div>

            {/* Template Download */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">CSV Template</CardTitle>
                <CardDescription className="text-sm">
                  Download the template to see the required format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={downloadTemplate} variant="outline" className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Upload CSV File</CardTitle>
                <CardDescription className="text-sm">
                  Select a CSV file with student data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    disabled={isUploading}
                    className="w-full sm:w-auto"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Choose CSV File
                  </Button>
                  {csvData.length > 0 && (
                    <Badge variant="secondary" className="w-fit">
                      {csvData.length} students ready
                    </Badge>
                  )}
                </div>

                {csvData.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Preview ({csvData.length} students)</span>
                      <Button
                        onClick={resetUpload}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 text-xs">
                      {csvData.slice(0, 5).map((student, index) => (
                        <div key={index} className="flex justify-between py-1">
                          <span>{student.name}</span>
                          <span className="text-muted-foreground">{student.roll_number}</span>
                        </div>
                      ))}
                      {csvData.length > 5 && (
                        <div className="text-muted-foreground text-center py-1">
                          ... and {csvData.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Progress */}
            {isUploading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Uploading students...</span>
                      <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload Results */}
            {uploadResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upload Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{uploadResult.success} successful</span>
                    </div>
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">{uploadResult.errors.length} errors</span>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Errors:</h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {uploadResult.errors.map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Row {error.row}: {error.error} - {error.data.name} ({error.data.roll_number})
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {csvData.length > 0 && !isUploading && !uploadResult && (
                <Button
                  onClick={uploadStudents}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary h-10"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Upload {csvData.length} Students</span>
                  <span className="sm:hidden">Upload {csvData.length}</span>
                </Button>
              )}
              {uploadResult && (
                <Button
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10"
                >
                  Close
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 sm:flex-none h-10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
