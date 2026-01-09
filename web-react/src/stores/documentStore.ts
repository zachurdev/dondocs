import { create } from 'zustand';
import { format } from 'date-fns';
import type { Reference, Enclosure, Paragraph, CopyTo, DocumentData, DocumentMode } from '@/types/document';
import { DOC_TYPE_CONFIG } from '@/types/document';
import { useHistoryStore } from './historyStore';
import type { DocumentSnapshot } from './historyStore';
import { debug } from '@/lib/debug';
import { TIMING } from '@/lib/constants';

// Military date format per SECNAV M-5216.5: "4 Jan 26" (day month 2-digit year)
const formatMilitaryDate = (date: Date): string => format(date, 'd MMM yy');

interface DocumentState {
  // Document data
  documentMode: DocumentMode;
  docType: string;
  formData: Partial<DocumentData>;
  references: Reference[];
  enclosures: Enclosure[];
  paragraphs: Paragraph[];
  copyTos: CopyTo[];

  // Actions - Form
  setDocumentMode: (mode: DocumentMode) => void;
  setDocType: (type: string) => void;
  setField: <K extends keyof DocumentData>(key: K, value: DocumentData[K]) => void;
  setFormData: (data: Partial<DocumentData>) => void;
  resetForm: () => void;

  // Actions - References
  addReference: (title: string, url?: string) => void;
  updateReference: (index: number, updates: Partial<Reference>) => void;
  removeReference: (index: number) => void;
  reorderReferences: (fromIndex: number, toIndex: number) => void;

  // Actions - Enclosures
  addEnclosure: (title: string, file?: Enclosure['file']) => void;
  updateEnclosure: (index: number, updates: Partial<Enclosure>) => void;
  removeEnclosure: (index: number) => void;
  reorderEnclosures: (fromIndex: number, toIndex: number) => void;

  // Actions - Paragraphs
  addParagraph: (text: string, level: number, afterIndex?: number) => void;
  updateParagraph: (index: number, updates: Partial<Paragraph>) => void;
  removeParagraph: (index: number) => void;
  reorderParagraphs: (fromIndex: number, toIndex: number) => void;
  indentParagraph: (index: number) => void;
  outdentParagraph: (index: number) => void;

  // Actions - Copy To
  addCopyTo: (text: string) => void;
  updateCopyTo: (index: number, text: string) => void;
  removeCopyTo: (index: number) => void;

  // Bulk Actions
  clearParagraphs: () => void;
  clearReferences: () => void;
  clearEnclosures: () => void;
  clearCopyTos: () => void;
  clearAll: () => void;
  loadTemplate: (data: {
    paragraphs?: Paragraph[];
    references?: Reference[];
    enclosures?: Enclosure[];
    copyTos?: CopyTo[];
    formData?: Partial<DocumentData>;
  }) => void;

  // History (Undo/Redo)
  applySnapshot: (snapshot: DocumentSnapshot) => void;
  getSnapshot: () => DocumentSnapshot;
}

const getNextReferenceLetter = (refs: Reference[]): string => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  return alphabet[refs.length] || `a${refs.length - 26}`;
};

const reLetterReferences = (refs: Reference[]): Reference[] => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  return refs.map((ref, index) => ({
    ...ref,
    letter: alphabet[index] || `a${index - 26}`,
  }));
};

const DEFAULT_FORM_DATA: Partial<DocumentData> = {
  docType: 'naval_letter',
  fontSize: '12pt',
  fontFamily: 'courier',
  pageNumbering: 'none',
  // Letterhead - Example unit info
  unitLine1: '1ST BATTALION, 6TH MARINES',
  unitLine2: '2D MARINE DIVISION, II MEF',
  unitAddress: 'PSC BOX 20123, CAMP LEJEUNE, NC 28542-0123',
  sealType: 'dod',
  // Document identification
  ssic: '3502',
  serial: '0847',
  date: formatMilitaryDate(new Date()),
  // Addressing
  from: 'Commanding Officer, 1st Battalion, 6th Marines',
  to: 'Commanding General, 2d Marine Division',
  via: 'Commanding Officer, 6th Marine Regiment',
  subject: 'AFTER ACTION REPORT FOR EXERCISE STEEL KNIGHT 25-1',
  // Signature
  sigFirst: 'James',
  sigMiddle: 'R',
  sigLast: 'MITCHELL',
  sigRank: 'Lieutenant Colonel',
  sigTitle: 'Commanding Officer',
  officeCode: 'S-3',
  byDirection: false,
  byDirectionAuthority: '',
  // Classification
  classLevel: 'unclassified',
  pocEmail: 'james.mitchell@usmc.mil',
  // Hyperlinks - default to OFF (no hyperlinks)
  includeHyperlinks: false,
};

// Default references for example document
const DEFAULT_REFERENCES: Reference[] = [
  { letter: 'a', title: 'MCO 3502.6A', url: '' },
  { letter: 'b', title: 'MCRP 3-30B.1 Ground Combat Operations', url: '' },
  { letter: 'c', title: '2d MarDiv FRAGO 25-0147 dtd 15 Nov 25', url: '' },
  { letter: 'd', title: 'MCO 3500.27C', url: '' },
];

// Default enclosures for example document
const DEFAULT_ENCLOSURES: Enclosure[] = [
  { title: 'Exercise Timeline and Scheme of Maneuver' },
  { title: 'Casualty Summary and Medical Evacuation Report' },
  { title: 'Ammunition Expenditure Report' },
  { title: 'Lessons Learned Compilation' },
];

// Default paragraphs for example document (two pages of content)
const DEFAULT_PARAGRAPHS: Paragraph[] = [
  { text: 'Purpose. Per reference (a), this letter provides the after action report for Exercise Steel Knight 25-1, conducted from 3-17 December 2025 in the Camp Lejeune Training Areas.', level: 0 },
  { text: 'Background. Exercise Steel Knight 25-1 was a battalion-level combined arms exercise designed to validate the combat readiness of 1st Battalion, 6th Marines in preparation for the upcoming deployment cycle. The exercise incorporated live-fire ranges, force-on-force training, and simulated combat operations against a near-peer adversary in accordance with reference (b).', level: 0 },
  { text: 'Execution Summary. The exercise was executed in three distinct phases over the 14-day training period:', level: 0 },
  { text: 'Phase I (3-6 December): Pre-deployment preparation and equipment staging. All companies completed pre-exercise certifications including weapons qualification, communications checks, and medical readiness verification. The battalion achieved 97 percent personnel readiness and 94 percent equipment operational status.', level: 1 },
  { text: 'Phase II (7-12 December): Main force-on-force operations. The battalion conducted offensive and defensive operations against the 2d Light Armored Reconnaissance Battalion acting as opposing force. Key events included a battalion attack on a simulated enemy defensive position, a deliberate defense against mechanized assault, and a 48-hour sustained operations period testing unit endurance and logistics support.', level: 1 },
  { text: 'Phase III (13-17 December): Live-fire combined arms training. Companies rotated through Range G-10 for platoon-level combined arms live-fire exercises, integrating organic weapons systems with supporting arms including 81mm mortars, artillery, and close air support.', level: 1 },
  { text: 'Assessment. Overall, 1st Battalion, 6th Marines demonstrated a high level of tactical proficiency and combat readiness throughout Exercise Steel Knight 25-1. The following areas were assessed:', level: 0 },
  { text: 'Tactical Proficiency. The battalion demonstrated excellent small unit tactics and fire team coordination during force-on-force operations. Squad leaders showed marked improvement in their ability to conduct fire and maneuver under simulated combat stress. Company commanders effectively synchronized maneuver elements with supporting fires.', level: 1 },
  { text: 'Command and Control. Battalion and company command posts maintained effective communications throughout the exercise. The tactical operations center successfully tracked and coordinated all subordinate elements during the 48-hour sustained operations period. Radio discipline was maintained at all levels.', level: 1 },
  { text: 'Logistics Support. Combat logistics support performed exceptionally well under demanding conditions. The battalion logistics officer coordinated timely resupply of ammunition, fuel, and rations throughout all phases. Medical evacuation procedures were tested and validated with zero simulated casualties exceeding doctrinal evacuation timelines.', level: 1 },
  { text: 'Fire Support Coordination. Integration of supporting arms was executed in accordance with reference (b). Forward observers demonstrated proficiency in calling for and adjusting indirect fires. No safety violations occurred during live-fire events.', level: 1 },
  { text: 'Areas for Improvement. The following areas have been identified for continued emphasis and training:', level: 0 },
  { text: 'Night Operations. While overall night operations proficiency was satisfactory, several squads experienced difficulty maintaining tactical dispersion during limited visibility movement. Recommend increased emphasis on night land navigation and movement techniques during pre-deployment training.', level: 1 },
  { text: 'Casualty Evacuation. Although no evacuation timeline standards were exceeded, the medical section identified opportunities to improve casualty collection point procedures and communication between aid stations and the battalion aid station.', level: 1 },
  { text: 'Electronic Warfare Considerations. The battalion experienced simulated electronic attack during Phase II operations that degraded communications capabilities. Units demonstrated inconsistent ability to transition to alternate communication methods. This area requires additional training focus.', level: 1 },
  { text: 'Equipment Status. Post-exercise equipment accountability and status is documented in enclosure (3). Of note, three High Mobility Multipurpose Wheeled Vehicles required unscheduled maintenance during the exercise but were returned to operational status within 24 hours by organic maintenance assets. Overall equipment readiness remained above 90 percent throughout the exercise.', level: 0 },
  { text: 'Lessons Learned. A comprehensive compilation of lessons learned is provided in enclosure (4). Key takeaways include the importance of realistic pre-exercise scenario development, the value of embedding observer-controllers at the squad level, and the benefit of conducting a thorough after action review at each echelon before consolidating findings.', level: 0 },
  { text: 'Recommendation. Based on the results of Exercise Steel Knight 25-1, 1st Battalion, 6th Marines is assessed as combat ready and prepared for the upcoming deployment. Recommend the battalion be certified for deployment in accordance with reference (d). Additionally, recommend lessons learned from this exercise be incorporated into the training plans for follow-on battalions in the deployment cycle.', level: 0 },
  { text: 'Point of Contact. Point of contact for this matter is the undersigned or Major T.J. Henderson, Battalion Operations Officer, at (910) 451-2847 or thomas.henderson@usmc.mil.', level: 0 },
];

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documentMode: 'compliant',
  docType: 'naval_letter',
  formData: { ...DEFAULT_FORM_DATA },
  references: [...DEFAULT_REFERENCES],
  enclosures: [...DEFAULT_ENCLOSURES],
  paragraphs: [...DEFAULT_PARAGRAPHS],
  copyTos: [{ text: 'G-3/5' }],

  setDocumentMode: (mode) => set((state) => {
    if (mode === 'compliant') {
      // Apply compliant formatting from doc type config
      const config = DOC_TYPE_CONFIG[state.docType] || DOC_TYPE_CONFIG.naval_letter;
      return {
        documentMode: mode,
        formData: {
          ...state.formData,
          fontSize: config.regulations.fontSize,
          fontFamily: config.regulations.fontFamily,
        },
      };
    }
    return { documentMode: mode };
  }),

  setDocType: (type) => set((state) => {
    const config = DOC_TYPE_CONFIG[type] || DOC_TYPE_CONFIG.naval_letter;
    // In compliant mode, always apply the regulation fonts
    if (state.documentMode === 'compliant') {
      return {
        docType: type,
        formData: {
          ...DEFAULT_FORM_DATA,
          docType: type,
          fontSize: config.regulations.fontSize,
          fontFamily: config.regulations.fontFamily,
        },
      };
    }
    return { docType: type, formData: { ...DEFAULT_FORM_DATA, docType: type } };
  }),

  setField: (key, value) => set((state) => ({
    formData: { ...state.formData, [key]: value },
  })),

  setFormData: (data) => set((state) => ({
    formData: { ...state.formData, ...data },
  })),

  resetForm: () => set({
    docType: 'naval_letter',
    formData: { ...DEFAULT_FORM_DATA },
    references: [...DEFAULT_REFERENCES],
    enclosures: [...DEFAULT_ENCLOSURES],
    paragraphs: [...DEFAULT_PARAGRAPHS],
    copyTos: [{ text: 'G-3/5' }],
  }),

  // References
  addReference: (title, url) => set((state) => ({
    references: [
      ...state.references,
      { letter: getNextReferenceLetter(state.references), title, url: url || '' },
    ],
  })),

  updateReference: (index, updates) => set((state) => ({
    references: state.references.map((ref, i) => (i === index ? { ...ref, ...updates } : ref)),
  })),

  removeReference: (index) => set((state) => ({
    references: reLetterReferences(state.references.filter((_, i) => i !== index)),
  })),

  reorderReferences: (fromIndex, toIndex) => set((state) => {
    const newRefs = [...state.references];
    const [moved] = newRefs.splice(fromIndex, 1);
    newRefs.splice(toIndex, 0, moved);
    return { references: reLetterReferences(newRefs) };
  }),

  // Enclosures
  addEnclosure: (title, file) => set((state) => ({
    enclosures: [...state.enclosures, { title, file }],
  })),

  updateEnclosure: (index, updates) => set((state) => ({
    enclosures: state.enclosures.map((enc, i) => (i === index ? { ...enc, ...updates } : enc)),
  })),

  removeEnclosure: (index) => set((state) => ({
    enclosures: state.enclosures.filter((_, i) => i !== index),
  })),

  reorderEnclosures: (fromIndex, toIndex) => set((state) => {
    const newEncls = [...state.enclosures];
    const [moved] = newEncls.splice(fromIndex, 1);
    newEncls.splice(toIndex, 0, moved);
    return { enclosures: newEncls };
  }),

  // Paragraphs
  addParagraph: (text, level, afterIndex) => set((state) => {
    const newPara = { text, level };
    if (afterIndex !== undefined) {
      const newParas = [...state.paragraphs];
      newParas.splice(afterIndex + 1, 0, newPara);
      return { paragraphs: newParas };
    }
    return { paragraphs: [...state.paragraphs, newPara] };
  }),

  updateParagraph: (index, updates) => set((state) => ({
    paragraphs: state.paragraphs.map((p, i) => (i === index ? { ...p, ...updates } : p)),
  })),

  removeParagraph: (index) => set((state) => ({
    paragraphs: state.paragraphs.filter((_, i) => i !== index),
  })),

  reorderParagraphs: (fromIndex, toIndex) => set((state) => {
    const newParas = [...state.paragraphs];
    const [moved] = newParas.splice(fromIndex, 1);
    newParas.splice(toIndex, 0, moved);
    return { paragraphs: newParas };
  }),

  indentParagraph: (index) => set((state) => ({
    paragraphs: state.paragraphs.map((p, i) =>
      i === index ? { ...p, level: Math.min(p.level + 1, 7) } : p
    ),
  })),

  outdentParagraph: (index) => set((state) => ({
    paragraphs: state.paragraphs.map((p, i) =>
      i === index ? { ...p, level: Math.max(p.level - 1, 0) } : p
    ),
  })),

  // Copy To
  addCopyTo: (text) => set((state) => ({
    copyTos: [...state.copyTos, { text }],
  })),

  updateCopyTo: (index, text) => set((state) => ({
    copyTos: state.copyTos.map((ct, i) => (i === index ? { text } : ct)),
  })),

  removeCopyTo: (index) => set((state) => ({
    copyTos: state.copyTos.filter((_, i) => i !== index),
  })),

  // Bulk Actions
  clearParagraphs: () => {
    debug.log('Store', 'Clearing all paragraphs');
    set({ paragraphs: [{ text: '', level: 0 }] });
  },

  clearReferences: () => {
    debug.log('Store', 'Clearing all references');
    set({ references: [] });
  },

  clearEnclosures: () => {
    debug.log('Store', 'Clearing all enclosures');
    set({ enclosures: [] });
  },

  clearCopyTos: () => {
    debug.log('Store', 'Clearing all copy-tos');
    set({ copyTos: [] });
  },

  clearAll: () => {
    debug.log('Store', 'Clearing all document content');
    set({
      paragraphs: [{ text: '', level: 0 }],
      references: [],
      enclosures: [],
      copyTos: [],
    });
  },

  loadTemplate: (data) => {
    debug.log('Store', 'Loading template', {
      paragraphs: data.paragraphs?.length,
      references: data.references?.length,
      enclosures: data.enclosures?.length,
      copyTos: data.copyTos?.length,
    });
    set((state) => ({
      paragraphs: data.paragraphs ?? state.paragraphs,
      references: data.references ? reLetterReferences(data.references) : state.references,
      enclosures: data.enclosures ?? state.enclosures,
      copyTos: data.copyTos ?? state.copyTos,
      formData: data.formData ? { ...state.formData, ...data.formData } : state.formData,
    }));
  },

  // History (Undo/Redo)
  applySnapshot: (snapshot) => set({
    documentMode: snapshot.documentMode,
    docType: snapshot.docType,
    formData: snapshot.formData,
    references: snapshot.references,
    enclosures: snapshot.enclosures,
    paragraphs: snapshot.paragraphs,
    copyTos: snapshot.copyTos,
  }),

  getSnapshot: (): DocumentSnapshot => {
    const state = get();
    return {
      documentMode: state.documentMode,
      docType: state.docType,
      formData: state.formData,
      references: state.references,
      enclosures: state.enclosures,
      paragraphs: state.paragraphs,
      copyTos: state.copyTos,
    };
  },
}));

// Subscribe to document changes and save snapshots
// Debounce to avoid saving on every keystroke
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

useDocumentStore.subscribe((state: DocumentState) => {
  // Debounce snapshot saving
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    try {
      const snapshot: DocumentSnapshot = {
        documentMode: state.documentMode,
        docType: state.docType,
        formData: state.formData,
        references: state.references,
        enclosures: state.enclosures,
        paragraphs: state.paragraphs,
        copyTos: state.copyTos,
      };
      useHistoryStore.getState().saveSnapshot(snapshot);
      debug.log('Store', 'Snapshot saved to history');
    } catch (err) {
      debug.error('Store', 'Failed to save snapshot to history', err);
    }
  }, TIMING.HISTORY_SNAPSHOT_DEBOUNCE);
});
