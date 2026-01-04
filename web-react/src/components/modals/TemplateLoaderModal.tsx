import { useState, useMemo } from 'react';
import { FileText, FolderOpen, Search, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';

interface TemplateParagraph {
  text: string;
  level: number;
}

interface TemplateReference {
  letter: string;
  title: string;
  url?: string;
}

interface LetterTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  docType: string;
  subject: string;
  paragraphs: TemplateParagraph[];
  references?: TemplateReference[];
}

// Pre-built letter templates for common correspondence
const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'leave-request',
    name: 'Leave Request',
    category: 'Administrative',
    description: 'Request for annual/special leave',
    docType: 'naval_letter',
    subject: 'REQUEST FOR LEAVE',
    paragraphs: [
      { text: 'Per reference (a), I respectfully request leave as follows:', level: 0 },
      { text: 'Type of leave: Annual Leave', level: 1 },
      { text: 'Dates: [START DATE] through [END DATE] ([NUMBER] days)', level: 1 },
      { text: 'Leave address: [ADDRESS]', level: 1 },
      { text: 'Contact phone: [PHONE NUMBER]', level: 1 },
      { text: 'Emergency contact: [NAME/PHONE]', level: 1 },
      { text: 'I have no conflicting duties or assignments during the requested leave period. All required turnover has been completed.', level: 0 },
      { text: 'Point of contact for this request is the undersigned at [EMAIL/PHONE].', level: 0 },
    ],
    references: [
      { letter: 'a', title: 'MCO 1050.3J (Leave and Liberty)' },
    ],
  },
  {
    id: 'award-recommendation',
    name: 'Award Recommendation',
    category: 'Awards',
    description: 'Recommendation for personal award',
    docType: 'naval_letter',
    subject: 'RECOMMENDATION FOR [AWARD NAME]',
    paragraphs: [
      { text: 'Per references (a) and (b), [RANK NAME] is recommended for the [AWARD NAME] for exceptionally meritorious service.', level: 0 },
      { text: 'Background. [RANK NAME] served as [BILLET] from [DATE] to [DATE].', level: 0 },
      { text: 'Justification. During this period, [RANK NAME] distinguished [himself/herself] by:', level: 0 },
      { text: '[SPECIFIC ACCOMPLISHMENT 1]', level: 1 },
      { text: '[SPECIFIC ACCOMPLISHMENT 2]', level: 1 },
      { text: '[SPECIFIC ACCOMPLISHMENT 3]', level: 1 },
      { text: 'The actions of [RANK NAME] reflect great credit upon [himself/herself] and are in keeping with the highest traditions of the United States Naval Service.', level: 0 },
      { text: 'Point of contact is [NAME] at [EMAIL/PHONE].', level: 0 },
    ],
    references: [
      { letter: 'a', title: 'SECNAVINST 1650.1H (Navy and Marine Corps Awards Manual)' },
      { letter: 'b', title: 'MCO 1650.19J (Marine Corps Awards Manual)' },
    ],
  },
  {
    id: 'ncoer-cover',
    name: 'Fitness Report Cover Letter',
    category: 'Personnel',
    description: 'Cover letter for fitness report submission',
    docType: 'naval_letter',
    subject: 'SUBMISSION OF FITNESS REPORT FOR [RANK NAME]',
    paragraphs: [
      { text: 'Per reference (a), enclosed is the fitness report for [RANK NAME] for the reporting period [START DATE] to [END DATE].', level: 0 },
      { text: 'Reporting occasion: [REGULAR/TRANSFER/DETACHMENT/ETC]', level: 0 },
      { text: 'All required signatures have been obtained and the report is complete.', level: 0 },
      { text: 'Point of contact is [NAME] at [EMAIL/PHONE].', level: 0 },
    ],
    references: [
      { letter: 'a', title: 'MCO 1610.7A (Performance Evaluation System)' },
    ],
  },
  {
    id: 'request-mast',
    name: 'Request Mast',
    category: 'Legal',
    description: 'Formal request to speak with commander',
    docType: 'naval_letter',
    subject: 'REQUEST MAST',
    paragraphs: [
      { text: 'Per reference (a), I respectfully request to speak with [COMMANDER TITLE] regarding [BRIEF SUBJECT].', level: 0 },
      { text: 'Facts. [DESCRIBE THE SITUATION OR ISSUE]', level: 0 },
      { text: 'Request. [STATE SPECIFICALLY WHAT ACTION IS REQUESTED]', level: 0 },
      { text: 'I understand that I may be accompanied by a witness at the request mast. I [DO/DO NOT] intend to bring a witness.', level: 0 },
    ],
    references: [
      { letter: 'a', title: 'MCO 1700.23F (Request Mast Procedures)' },
    ],
  },
  {
    id: 'training-request',
    name: 'Training Request',
    category: 'Training',
    description: 'Request for schools or training',
    docType: 'naval_letter',
    subject: 'REQUEST FOR TRAINING: [COURSE NAME]',
    paragraphs: [
      { text: 'Per reference (a), I respectfully request approval to attend the following training:', level: 0 },
      { text: 'Course Title: [COURSE NAME]', level: 1 },
      { text: 'Course Number: [COURSE NUMBER]', level: 1 },
      { text: 'Location: [LOCATION]', level: 1 },
      { text: 'Dates: [START DATE] to [END DATE]', level: 1 },
      { text: 'Cost: [COST IF APPLICABLE]', level: 1 },
      { text: 'Justification. This training will enhance my ability to perform duties as [BILLET] by [EXPLAIN BENEFIT].', level: 0 },
      { text: 'Impact. [EXPLAIN ANY IMPACT TO UNIT READINESS OR COVERAGE PLAN]', level: 0 },
      { text: 'Point of contact is the undersigned at [EMAIL/PHONE].', level: 0 },
    ],
    references: [
      { letter: 'a', title: 'MCO 1553.4B (Training Management)' },
    ],
  },
  {
    id: 'meritorious-mast',
    name: 'Meritorious Mast',
    category: 'Awards',
    description: 'Recommendation for meritorious mast',
    docType: 'naval_letter',
    subject: 'MERITORIOUS MAST FOR [RANK NAME]',
    paragraphs: [
      { text: '[RANK NAME] is recommended for a Meritorious Mast for outstanding performance of duty.', level: 0 },
      { text: 'On [DATE], [RANK NAME] demonstrated exceptional [SKILL/INITIATIVE/DEDICATION] by [DESCRIBE SPECIFIC ACTION].', level: 0 },
      { text: 'The direct result of [his/her] actions was [DESCRIBE POSITIVE OUTCOME].', level: 0 },
      { text: '[RANK NAME]\'s performance reflects positively on [himself/herself], this command, and the Marine Corps.', level: 0 },
    ],
  },
  {
    id: 'endorsement-approve',
    name: 'Endorsement (Approve)',
    category: 'Endorsements',
    description: 'Standard approval endorsement',
    docType: 'same_page_endorsement',
    subject: '',
    paragraphs: [
      { text: 'Approved.', level: 0 },
    ],
  },
  {
    id: 'endorsement-disapprove',
    name: 'Endorsement (Disapprove)',
    category: 'Endorsements',
    description: 'Standard disapproval endorsement with reason',
    docType: 'same_page_endorsement',
    subject: '',
    paragraphs: [
      { text: 'Disapproved.', level: 0 },
      { text: '[STATE REASON FOR DISAPPROVAL]', level: 0 },
    ],
  },
  {
    id: 'endorsement-forward',
    name: 'Endorsement (Forward)',
    category: 'Endorsements',
    description: 'Forwarding endorsement with recommendation',
    docType: 'new_page_endorsement',
    subject: '',
    paragraphs: [
      { text: 'Forwarded, recommending [APPROVAL/DISAPPROVAL].', level: 0 },
      { text: '[ADDITIONAL COMMENTS OR INFORMATION]', level: 0 },
    ],
  },
  {
    id: 'mfr-meeting',
    name: 'MFR - Meeting Notes',
    category: 'Memoranda',
    description: 'Record of meeting or discussion',
    docType: 'mfr',
    subject: 'RECORD OF MEETING: [TOPIC]',
    paragraphs: [
      { text: 'Purpose. This memorandum records the discussion held on [DATE] regarding [TOPIC].', level: 0 },
      { text: 'Attendees:', level: 0 },
      { text: '[RANK/NAME, TITLE]', level: 1 },
      { text: '[RANK/NAME, TITLE]', level: 1 },
      { text: 'Discussion. [SUMMARIZE KEY POINTS DISCUSSED]', level: 0 },
      { text: 'Decisions. The following decisions were made:', level: 0 },
      { text: '[DECISION 1]', level: 1 },
      { text: '[DECISION 2]', level: 1 },
      { text: 'Action Items:', level: 0 },
      { text: '[ACTION] - [RESPONSIBLE PARTY] - [DUE DATE]', level: 1 },
    ],
  },
  {
    id: 'pcs-checklist-letter',
    name: 'PCS Orders Acknowledgment',
    category: 'Administrative',
    description: 'Acknowledgment of PCS orders receipt',
    docType: 'naval_letter',
    subject: 'ACKNOWLEDGMENT OF PERMANENT CHANGE OF STATION ORDERS',
    paragraphs: [
      { text: 'Per reference (a), I acknowledge receipt of PCS orders dated [DATE] directing my transfer to [NEW DUTY STATION].', level: 0 },
      { text: 'Report date: [DATE]', level: 0 },
      { text: 'I have reviewed the orders for accuracy and confirm the following:', level: 0 },
      { text: 'Dependent information is correct', level: 1 },
      { text: 'Entitlements are understood', level: 1 },
      { text: 'Special instructions acknowledged', level: 1 },
      { text: 'I will complete all checkout requirements per reference (b) prior to departure.', level: 0 },
    ],
    references: [
      { letter: 'a', title: 'PCS Orders [ORDER NUMBER]' },
      { letter: 'b', title: 'Local SOP for Checkout Procedures' },
    ],
  },
  {
    id: 'letter-of-instruction',
    name: 'Letter of Instruction',
    category: 'Operations',
    description: 'Formal instructions for an event or operation',
    docType: 'naval_letter',
    subject: 'LETTER OF INSTRUCTION FOR [EVENT/OPERATION NAME]',
    paragraphs: [
      { text: 'Situation. [DESCRIBE THE EVENT OR REQUIREMENT]', level: 0 },
      { text: 'Mission. [STATE THE MISSION OR OBJECTIVE]', level: 0 },
      { text: 'Execution:', level: 0 },
      { text: 'Commander\'s Intent. [STATE INTENT]', level: 1 },
      { text: 'Concept of Operations. [DESCRIBE HOW THE MISSION WILL BE ACCOMPLISHED]', level: 1 },
      { text: 'Tasks:', level: 1 },
      { text: '[TASK 1 - RESPONSIBLE UNIT/PERSON]', level: 2 },
      { text: '[TASK 2 - RESPONSIBLE UNIT/PERSON]', level: 2 },
      { text: 'Coordinating Instructions:', level: 1 },
      { text: 'Timeline: [KEY DATES/TIMES]', level: 2 },
      { text: 'Uniform: [IF APPLICABLE]', level: 2 },
      { text: 'Admin/Logistics. [DESCRIBE SUPPORT REQUIREMENTS]', level: 0 },
      { text: 'Command/Signal. POC is [NAME] at [EMAIL/PHONE].', level: 0 },
    ],
  },
];

const CATEGORIES = [...new Set(LETTER_TEMPLATES.map(t => t.category))];

export function TemplateLoaderModal() {
  const { templateLoaderOpen, setTemplateLoaderOpen } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    return LETTER_TEMPLATES.filter((template) => {
      const matchesSearch = !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleLoadTemplate = () => {
    if (!selectedTemplate) return;

    const store = useDocumentStore.getState();

    // Set document type
    store.setDocType(selectedTemplate.docType);

    // Set subject
    if (selectedTemplate.subject) {
      store.setField('subject', selectedTemplate.subject);
    }

    // Clear existing paragraphs by removing from the end (avoids index shifting issues)
    const currentParagraphCount = store.paragraphs.length;
    for (let i = currentParagraphCount - 1; i >= 0; i--) {
      store.removeParagraph(i);
    }

    // Add template paragraphs
    selectedTemplate.paragraphs.forEach((para) => {
      store.addParagraph(para.text, para.level);
    });

    // Clear existing references by removing from the end
    const currentRefCount = store.references.length;
    for (let i = currentRefCount - 1; i >= 0; i--) {
      store.removeReference(i);
    }

    // Add template references
    if (selectedTemplate.references) {
      selectedTemplate.references.forEach((ref) => {
        store.addReference(ref.title, ref.url);
      });
    }

    // Close modal and reset state
    setTemplateLoaderOpen(false);
    setSelectedTemplate(null);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const handleClose = () => {
    setTemplateLoaderOpen(false);
    setSelectedTemplate(null);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  return (
    <Dialog open={templateLoaderOpen} onOpenChange={setTemplateLoaderOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="bg-background px-6 py-4 border-b shrink-0 z-10">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Load Template
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 border-b shrink-0 space-y-3 bg-background z-10">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/80"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {CATEGORIES.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 grid gap-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No templates found matching your search.
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        {selectedTemplate?.id === template.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {template.paragraphs.length} paragraph{template.paragraphs.length !== 1 ? 's' : ''}
                          {template.references && ` • ${template.references.length} reference${template.references.length !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedTemplate && (
          <div className="p-4 border-t bg-muted/50 shrink-0 z-10">
            <div className="text-sm">
              <span className="font-medium">Preview:</span>
              <p className="text-muted-foreground mt-1">
                {selectedTemplate.subject || '(No subject - endorsement)'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This will replace your current document content.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="bg-background px-6 py-4 border-t shrink-0 z-10">
          <Button
            variant="outline"
            onClick={handleClose}
            className="hover:bg-accent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLoadTemplate}
            disabled={!selectedTemplate}
            className="hover:bg-primary/90"
          >
            <FileText className="h-4 w-4 mr-2" />
            Load Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
