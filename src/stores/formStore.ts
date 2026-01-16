import { create } from 'zustand';

export interface Navmc11811Data {
  // Marine identification
  lastName: string;
  firstName: string;
  middleName: string;
  edipi: string;
  
  // The main 6105 entry content
  remarksText: string;
  
  // Entry date
  entryDate: string;
}

export interface NavmcForm10274Data {
  // Field 1: Action Number
  actionNo: string;
  // Field 2: SSIC/File Number
  ssicFileNo: string;
  // Field 3: Date
  date: string;
  // Field 4: From
  from: string;
  // Field 5: Via
  via: string;
  // Field 6: Organization/Station
  orgStation: string;
  // Field 7: To
  to: string;
  // Field 8: Nature of Action
  natureOfAction: string;
  // Field 9: Copy To
  copyTo: string;
  // Field 10: References/Authority
  references: string;
  // Field 11: Enclosures
  enclosures: string;
  // Field 12: Supplemental Information (main counseling text)
  supplementalInfo: string;
  // Field 13: Proposed/Recommended Action
  proposedAction: string;
}

interface FormStore {
  navmc10274: NavmcForm10274Data;
  setNavmc10274Field: <K extends keyof NavmcForm10274Data>(key: K, value: NavmcForm10274Data[K]) => void;
  resetNavmc10274: () => void;
  
  navmc11811: Navmc11811Data;
  setNavmc11811Field: <K extends keyof Navmc11811Data>(key: K, value: Navmc11811Data[K]) => void;
  resetNavmc11811: () => void;
}

const DEFAULT_NAVMC_10274: NavmcForm10274Data = {
  actionNo: '',
  ssicFileNo: '1610',
  date: new Date().toISOString().split('T')[0],
  from: '',
  via: '',
  orgStation: '',
  to: '',
  natureOfAction: '',
  copyTo: '',
  references: 'MCO 1610.7A',
  enclosures: '',
  supplementalInfo: '',
  proposedAction: '',
};

const DEFAULT_NAVMC_11811: Navmc11811Data = {
  lastName: '',
  firstName: '',
  middleName: '',
  edipi: '',
  remarksText: '',
  entryDate: new Date().toISOString().split('T')[0],
};

export const useFormStore = create<FormStore>((set) => ({
  navmc10274: { ...DEFAULT_NAVMC_10274 },

  setNavmc10274Field: (key, value) => set((state) => ({
    navmc10274: { ...state.navmc10274, [key]: value },
  })),

  resetNavmc10274: () => set({
    navmc10274: { ...DEFAULT_NAVMC_10274 },
  }),

  navmc11811: { ...DEFAULT_NAVMC_11811 },

  setNavmc11811Field: (key, value) => set((state) => ({
    navmc11811: { ...state.navmc11811, [key]: value },
  })),

  resetNavmc11811: () => set({
    navmc11811: { ...DEFAULT_NAVMC_11811 },
  }),
}));
