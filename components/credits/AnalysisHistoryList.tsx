'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Analysis {
  _id: string;
  fileName?: string;
  currentScore: number;
  potentialScore: number;
  currentCallback: number;
  potentialCallback: number;
  createdAt: string;
  jobDescription: string;
  resumeText: string;
}

interface AnalysisHistoryListProps {
  onViewAnalysis?: (analysis: Analysis) => void;
  onGenerateResume?: (analysis: Analysis) => void;
}

export default function AnalysisHistoryList({
  onViewAnalysis,
  onGenerateResume,
}: AnalysisHistoryListProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analysis/history?limit=10');
      
      if (!response.ok) {
        throw new Error('Failed to fetch analyses');
      }

      const data = await response.json();
      setAnalyses(data.analyses);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analysis history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      const response = await fetch(`/api/analysis/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete analysis');
      }

      setAnalyses(analyses.filter(a => a._id !== id));
      toast({
        title: 'Success',
        description: 'Analysis deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete analysis',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    if (score >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    if (score >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">
            No analyses yet. Start by analyzing your resume against a job description.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <div
              key={analysis._id}
              className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">
                    {analysis.fileName || 'Resume Analysis'}
                  </h4>
                  <Badge className={getScoreBadgeColor(analysis.currentScore)}>
                    {analysis.currentScore}%
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {format(new Date(analysis.createdAt), 'MMM dd, yyyy HH:mm')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                  {analysis.jobDescription.substring(0, 100)}...
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewAnalysis?.(analysis)}
                  title="View Analysis"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onGenerateResume?.(analysis)}
                  title="Generate Optimized Resume"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(analysis._id)}
                  disabled={deleting === analysis._id}
                  title="Delete Analysis"
                >
                  {deleting === analysis._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
