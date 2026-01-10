import { X, Loader2, AlertCircle, ScrollText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { useLogStore } from '@/stores/logStore';

interface MobilePreviewModalProps {
  pdfUrl: string | null;
  isCompiling: boolean;
  error: string | null;
  onDownloadPdf?: () => void;
}

export function MobilePreviewModal({ pdfUrl, isCompiling, error, onDownloadPdf }: MobilePreviewModalProps) {
  const { mobilePreviewOpen, setMobilePreviewOpen } = useUIStore();
  const { setOpen: setLogViewerOpen, setEnabled: setLogEnabled } = useLogStore();

  // Filter out engine reset message - it's not a user-facing error
  const displayError = error === 'ENGINE_RESET_NEEDED' ? null : error;

  const handleOpenLogs = () => {
    setLogEnabled(true); // Enable logging when opening
    setLogViewerOpen(true);
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  if (!mobilePreviewOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="font-medium">PDF Preview</span>
          {isCompiling && (
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Compiling...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {pdfUrl && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenInNewTab}
                title="Open in New Tab (for multi-page viewing)"
              >
                <ExternalLink className="h-5 w-5" />
              </Button>
              {onDownloadPdf && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDownloadPdf}
                  title="Download PDF"
                >
                  <Download className="h-5 w-5" />
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenLogs}
            title="View Logs"
          >
            <ScrollText className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobilePreviewOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-muted/30">
        {/* Show PDF if available, with optional loading overlay */}
        {pdfUrl && (
          <>
            <iframe
              src={pdfUrl}
              className="absolute inset-0 w-full h-full border-0"
              title="PDF Preview"
            />
            {/* Tip for multi-page viewing */}
            {!isCompiling && (
              <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-2">
                <p className="text-xs text-muted-foreground text-center">
                  <ExternalLink className="h-3 w-3 inline mr-1" />
                  Tap the open icon above to view all pages in your browser
                </p>
              </div>
            )}
            {/* Loading overlay on top of existing PDF */}
            {isCompiling && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 bg-card px-6 py-4 rounded-lg shadow-lg border border-border">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Compiling document...</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error state - only show if no PDF */}
        {displayError && !pdfUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{displayError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenLogs}
                className="mt-2"
              >
                <ScrollText className="h-4 w-4 mr-2" />
                View Logs
              </Button>
            </div>
          </div>
        )}

        {/* Initial loading state - no PDF yet */}
        {!pdfUrl && !displayError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              {isCompiling ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm font-medium">Generating PDF...</p>
                  <p className="text-xs text-muted-foreground">This may take a moment</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">PDF preview will appear here</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
