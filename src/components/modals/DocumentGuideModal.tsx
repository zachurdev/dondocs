import { useState, useMemo } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, FileText, CheckCircle2, Lightbulb, BookOpen, Sparkles, ArrowRight, RotateCcw, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { DOCUMENT_TYPE_GUIDES, GUIDE_CATEGORIES, type DocumentTypeGuide } from '@/data/documentGuide';

// Document Finder Questions and Logic
interface Question {
  id: string;
  question: string;
  options: {
    label: string;
    value: string;
    icon?: string;
  }[];
}

const FINDER_QUESTIONS: Question[] = [
  {
    id: 'recipient',
    question: 'Who is the primary recipient?',
    options: [
      { label: 'Military command or unit', value: 'military', icon: '🎖️' },
      { label: 'Civilian person or business', value: 'civilian', icon: '💼' },
      { label: 'Multiple addressees', value: 'multiple', icon: '📨' },
      { label: 'For the record (no specific recipient)', value: 'record', icon: '📔' },
    ],
  },
  {
    id: 'purpose',
    question: 'What is the main purpose?',
    options: [
      { label: 'Request or recommendation', value: 'request', icon: '📋' },
      { label: 'Provide information or guidance', value: 'inform', icon: '📢' },
      { label: 'Document a decision or event', value: 'document', icon: '📝' },
      { label: 'Establish an agreement', value: 'agreement', icon: '🤝' },
      { label: 'Respond to another letter', value: 'response', icon: '↩️' },
    ],
  },
  {
    id: 'signers',
    question: 'How many officials are signing?',
    options: [
      { label: 'One person signing', value: 'single', icon: '✍️' },
      { label: 'Two people/commands signing together', value: 'dual', icon: '✍️✍️' },
    ],
  },
  {
    id: 'formality',
    question: 'What level of formality is needed?',
    options: [
      { label: 'Formal with official letterhead', value: 'formal', icon: '🏛️' },
      { label: 'Internal/routine (less formal)', value: 'informal', icon: '📄' },
      { label: 'Executive/senior leadership', value: 'executive', icon: '⭐' },
    ],
  },
];

interface FinderResult {
  docType: string;
  confidence: 'high' | 'medium';
  reason: string;
}

function getRecommendations(answers: Record<string, string>): FinderResult[] {
  const results: FinderResult[] = [];
  const { recipient, purpose, signers, formality } = answers;

  // Endorsement - responding to another letter
  if (purpose === 'response') {
    if (formality === 'informal') {
      results.push({
        docType: 'same_page_endorsement',
        confidence: 'high',
        reason: 'Best for brief endorsements that fit on the original letter',
      });
    } else {
      results.push({
        docType: 'new_page_endorsement',
        confidence: 'high',
        reason: 'Best for detailed endorsements requiring own letterhead',
      });
    }
    return results;
  }

  // Agreements - MOA/MOU
  if (purpose === 'agreement') {
    if (signers === 'dual') {
      results.push({
        docType: 'moa',
        confidence: 'high',
        reason: 'Best for formal agreements with specific resource commitments',
      });
      results.push({
        docType: 'mou',
        confidence: 'medium',
        reason: 'Alternative for less formal understanding without specific commitments',
      });
    } else {
      results.push({
        docType: 'mou',
        confidence: 'high',
        reason: 'MOUs can be signed by one party first, then countersigned',
      });
    }
    return results;
  }

  // For the record - MFR
  if (recipient === 'record') {
    results.push({
      docType: 'mfr',
      confidence: 'high',
      reason: 'Memorandum for the Record is specifically designed for documentation',
    });
    return results;
  }

  // Civilian recipients - Business Letter
  if (recipient === 'civilian') {
    results.push({
      docType: 'business_letter',
      confidence: 'high',
      reason: 'Business letter format is appropriate for civilian recipients',
    });
    return results;
  }

  // Multiple addressees
  if (recipient === 'multiple') {
    if (signers === 'dual') {
      results.push({
        docType: 'joint_letter',
        confidence: 'high',
        reason: 'Joint letter for coordinated communication from two commands',
      });
    } else {
      results.push({
        docType: 'multiple_address_letter',
        confidence: 'high',
        reason: 'Multiple address letter sends same content to many recipients',
      });
    }
    return results;
  }

  // Dual signers
  if (signers === 'dual') {
    if (purpose === 'inform' || purpose === 'document') {
      results.push({
        docType: 'joint_memorandum',
        confidence: 'high',
        reason: 'Joint memorandum for coordinated internal communication',
      });
    } else {
      results.push({
        docType: 'joint_letter',
        confidence: 'high',
        reason: 'Joint letter for coordinated official correspondence',
      });
    }
    return results;
  }

  // Executive level
  if (formality === 'executive') {
    if (purpose === 'document') {
      results.push({
        docType: 'executive_memorandum',
        confidence: 'high',
        reason: 'Executive memorandum for senior leadership communication',
      });
    } else {
      results.push({
        docType: 'executive_correspondence',
        confidence: 'high',
        reason: 'Executive correspondence for flag/general officer level',
      });
    }
    results.push({
      docType: 'naval_letter',
      confidence: 'medium',
      reason: 'Naval letter is also appropriate for formal executive matters',
    });
    return results;
  }

  // Document a decision
  if (purpose === 'document') {
    if (answers.recipient === 'military' && formality === 'formal') {
      results.push({
        docType: 'decision_memorandum',
        confidence: 'high',
        reason: 'Decision memorandum presents options for commander decision',
      });
    }
    results.push({
      docType: 'mfr',
      confidence: 'medium',
      reason: 'MFR is good for documenting events or decisions for the record',
    });
    return results;
  }

  // Internal/informal communication
  if (formality === 'informal') {
    if (purpose === 'inform') {
      results.push({
        docType: 'plain_paper_memorandum',
        confidence: 'high',
        reason: 'Plain paper memo for routine internal communication',
      });
      results.push({
        docType: 'mf',
        confidence: 'medium',
        reason: 'Memorandum For is also good for direct internal communication',
      });
    } else {
      results.push({
        docType: 'letterhead_memorandum',
        confidence: 'high',
        reason: 'Letterhead memo for semi-formal internal requests',
      });
    }
    return results;
  }

  // Default - formal military correspondence
  results.push({
    docType: 'naval_letter',
    confidence: 'high',
    reason: 'Naval letter is the standard format for official military correspondence',
  });

  if (formality === 'formal' && purpose === 'request') {
    results.push({
      docType: 'letterhead_memorandum',
      confidence: 'medium',
      reason: 'Letterhead memo is also appropriate for formal internal requests',
    });
  }

  return results;
}

// Document Finder Component
function DocumentFinder({ onSelectGuide }: { onSelectGuide: (guideId: string) => void }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // Move to next question or show results
    if (currentQuestion < FINDER_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  const recommendations = useMemo(() => {
    if (!showResults) return [];
    return getRecommendations(answers);
  }, [showResults, answers]);

  const question = FINDER_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + (showResults ? 1 : 0)) / FINDER_QUESTIONS.length) * 100;

  if (showResults) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center pb-4 border-b">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 text-green-500 mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Recommended Document Types</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Based on your answers, here are the best options
          </p>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec, index) => {
            const guide = DOCUMENT_TYPE_GUIDES.find(g => g.id === rec.docType);
            if (!guide) return null;

            return (
              <button
                key={rec.docType}
                onClick={() => onSelectGuide(rec.docType)}
                className={`w-full text-left p-4 rounded-lg border transition-all hover:border-primary hover:bg-accent/50 ${
                  index === 0 ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{guide.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{guide.name}</span>
                      {rec.confidence === 'high' && index === 0 && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                          Best Match
                        </Badge>
                      )}
                      {rec.confidence === 'medium' && (
                        <Badge variant="outline" className="text-xs">
                          Alternative
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {rec.reason}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {currentQuestion + 1} of {FINDER_QUESTIONS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="text-center py-4">
        <h3 className="text-lg font-semibold">{question.question}</h3>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleAnswer(question.id, option.value)}
            className="w-full text-left p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{option.icon}</span>
              <span className="flex-1 font-medium">{option.label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Back / Reset */}
      {currentQuestion > 0 && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const prevQuestion = FINDER_QUESTIONS[currentQuestion - 1];
              const newAnswers = { ...answers };
              delete newAnswers[prevQuestion.id];
              setAnswers(newAnswers);
              setCurrentQuestion(currentQuestion - 1);
            }}
          >
            Back to previous question
          </Button>
        </div>
      )}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<'finder' | 'browse'>('finder');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const filteredGuides = useMemo(() => {
    if (!selectedCategory) return DOCUMENT_TYPE_GUIDES;
    return DOCUMENT_TYPE_GUIDES.filter(guide => guide.category === selectedCategory);
  }, [selectedCategory]);

  const handleToggleGuide = (guideId: string) => {
    setExpandedGuide(expandedGuide === guideId ? null : guideId);
  };

  const handleSelectFromFinder = (guideId: string) => {
    setActiveTab('browse');
    setSelectedCategory(null);
    setExpandedGuide(guideId);
    // Scroll to the guide after a short delay
    setTimeout(() => {
      const element = document.getElementById(`guide-${guideId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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
            Find the right document type or browse all options
          </p>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab('finder')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'finder'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Find My Document
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'browse'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="h-4 w-4" />
              Browse All Types
            </button>
          </div>
        </div>

        {activeTab === 'finder' ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DocumentFinder onSelectGuide={handleSelectFromFinder} />
          </div>
        ) : (
          <>
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
                  <div key={guide.id} id={`guide-${guide.id}`}>
                    <GuideCard
                      guide={guide}
                      isExpanded={expandedGuide === guide.id}
                      onToggle={() => handleToggleGuide(guide.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

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
