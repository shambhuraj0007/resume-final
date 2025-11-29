'use client';

import { useEffect, useState } from 'react';
import { History, FileText, CheckCircle, XCircle, Loader2, Coins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AnalysisRecord {
  _id: string;
  analysisType: string;
  creditsUsed: number;
  fileName?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export default function AnalysisHistory() {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/credits/history?limit=20');
      const data = await response.json();
      
      if (response.ok) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisTypeLabel = (type: string) => {
    switch (type) {
      case 'resume_analysis':
        return 'Resume Analysis';
      case 'resume_creation':
        return 'Resume Creation';
      case 'resume_edit':
        return 'Resume Edit';
      default:
        return type;
    }
  };

  const truncateFileName = (fileName: string, maxLength: number = 25) => {
    if (!fileName || fileName.length <= maxLength) return fileName;
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - 3 - (extension?.length || 0));
    return `${truncatedName}...${extension}`;
  };

  if (loading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <History className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Analysis History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading analyses...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <History className="h-5 w-5 text-primary flex-shrink-0" />
          <span>Analysis History</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Your recent resume analyses and activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">No analysis history yet</p>
            <p className="text-xs text-muted-foreground">
              Start analyzing resumes to see your history here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record._id}
                className="flex items-start gap-3 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                {/* Status Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {record.status === 'success' ? (
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-red-500/10">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium text-sm sm:text-base">
                      {getAnalysisTypeLabel(record.analysisType)}
                    </p>
                    <Badge 
                      variant={record.status === 'success' ? 'default' : 'destructive'} 
                      className="text-xs flex-shrink-0"
                    >
                      {record.status}
                    </Badge>
                    {/* Credits badge on mobile - inline with status */}
                    <Badge 
                      variant="secondary" 
                      className="text-xs flex-shrink-0 sm:hidden flex items-center gap-1"
                    >
                      <Coins className="h-3 w-3" />
                      credits
                      {record.creditsUsed}
                    </Badge>
                  </div>
                  {record.fileName && (
                    <p 
                      className="text-xs sm:text-sm text-muted-foreground break-all sm:truncate" 
                      title={record.fileName}
                    >
                      <span className="sm:hidden">{truncateFileName(record.fileName, 30)}</span>
                      <span className="hidden sm:inline">{truncateFileName(record.fileName, 50)}</span>
                    </p>
                  )}
                  {record.errorMessage && (
                    <p className="text-xs text-red-500 mt-1 break-words">
                      {record.errorMessage}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>

                {/* Credits display on desktop - separate column */}
                <div className="hidden sm:flex flex-col items-end justify-start gap-1 flex-shrink-0 ml-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Coins className="h-4 w-4 text-primary" />
                    <span>{record.creditsUsed}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {record.creditsUsed === 1 ? 'credit' : 'credits'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
