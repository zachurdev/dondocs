import { useState, useMemo } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, FileText, CheckCircle2, Lightbulb, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/stores/uiStore';
import { DOCUMENT_TYPE_GUIDES, GUIDE_CATEGORIES, type DocumentTypeGuide } from '@/data/documentGuide';

function GuideCard({ guide, isExpanded, onToggle }: {
  guide: DocumentTypeGuide;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden bg-card transition-all">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{guide.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{guide.name}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {guide.summary}
            </p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t bg-muted/30">
          <div className="pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <Lightbulb className="h-4 w-4" />
              When to Use
            </div>
            <ul className="space-y-1.5">
              {guide.whenToUse.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <FileText className="h-4 w-4" />
              Key Features
            </div>
            <div className="flex flex-wrap gap-1.5">
              {guide.keyFeatures.map((feature, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <BookOpen className="h-4 w-4" />
              Common Examples
            </div>
            <div className="flex flex-wrap gap-1.5">
              {guide.commonExamples.map((example, i) => (
                <span
                  key={i}
                  className="text-xs bg-background border rounded-full px-2.5 py-1 text-muted-foreground"
                >
                  {example}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              Reference: {guide.reference}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentGuideModal() {
  const { documentGuideOpen, setDocumentGuideOpen } = useUIStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const filteredGuides = useMemo(() => {
    if (!selectedCategory) return DOCUMENT_TYPE_GUIDES;
    return DOCUMENT_TYPE_GUIDES.filter(guide => guide.category === selectedCategory);
  }, [selectedCategory]);

  const handleToggleGuide = (guideId: string) => {
    setExpandedGuide(expandedGuide === guideId ? null : guideId);
  };

  return (
    <Dialog open={documentGuideOpen} onOpenChange={setDocumentGuideOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="bg-background px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Document Type Guide
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Learn when to use each document type for your correspondence
          </p>
        </DialogHeader>

        {/* Category filters */}
        <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setExpandedGuide(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background border hover:bg-accent'
              }`}
            >
              All Types
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {DOCUMENT_TYPE_GUIDES.length}
              </Badge>
            </button>
            {GUIDE_CATEGORIES.map((cat) => {
              const count = DOCUMENT_TYPE_GUIDES.filter(g => g.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setExpandedGuide(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border hover:bg-accent'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                  <Badge
                    variant={selectedCategory === cat.id ? 'outline' : 'secondary'}
                    className={`ml-1 h-5 px-1.5 text-xs ${selectedCategory === cat.id ? 'border-primary-foreground/30' : ''}`}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Guide list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-3">
            {selectedCategory && (
              <div className="pb-2 mb-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {GUIDE_CATEGORIES.find(c => c.id === selectedCategory)?.icon}
                  </span>
                  <div>
                    <h3 className="font-semibold">{selectedCategory}</h3>
                    <p className="text-sm text-muted-foreground">
                      {GUIDE_CATEGORIES.find(c => c.id === selectedCategory)?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {filteredGuides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                isExpanded={expandedGuide === guide.id}
                onToggle={() => handleToggleGuide(guide.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer with tip */}
        <div className="px-4 py-3 border-t bg-muted/30 shrink-0">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Tip:</strong> When in doubt, the Naval Letter format is appropriate for most official correspondence. Use Business Letter format only for external civilian recipients.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
