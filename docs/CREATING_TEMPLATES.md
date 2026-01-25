# Creating New Document Templates

This guide explains how to add new document types to DonDocs.

---

## Overview

DonDocs uses a modular LaTeX template system. Each document type (Naval Letter, MFR, Business Letter, etc.) has its own template file that defines:

- How the date/SSIC block is formatted (`\printDateAndTitle`)
- How From/To/Via/Subject appears (`\printAddressBlock`)
- How the signature block is rendered (`\printSignature`)
- Page styles for headers/footers

The main template (`tex/main.tex`) handles common elements like letterhead, references, enclosures, and paragraph formatting.

---

## Template Architecture

```
tex/
├── main.tex                    # Main document structure, packages, base commands
├── swiftlatex-compat.sty       # SwiftLaTeX compatibility layer
└── templates/
    ├── naval_letter.tex        # Standard naval letter format
    ├── mfr.tex                 # Memorandum for the Record
    ├── business_letter.tex     # Business letter format
    ├── joint_letter.tex        # Joint letter (dual signatures)
    ├── moa.tex                 # Memorandum of Agreement
    └── ...                     # Other document types
```

### How Templates Are Loaded

1. The React app calls `generator.ts` which generates config `.tex` files
2. `document.tex` sets the document type via `\setDocumentType{naval_letter}`
3. `main.tex` loads the template via `\input{\DocumentType}`
4. The template defines the three required commands

---

## Creating a New Template

### Step 1: Create the Template File

Create a new file in `tex/templates/` named after your document type (use snake_case):

```latex
%=============================================================================
%
%                     YOUR DOCUMENT TYPE NAME
%
%=============================================================================
%
% References:
%   - SECNAV M-5216.5 (DON Correspondence Manual), Chapter X
%   - Any other applicable references
%
%=============================================================================


%=============================================================================
%                    DATE / SSIC BLOCK
%=============================================================================

\newcommand{\printDateAndTitle}{%
    \begingroup
    \applyDocumentFontSize
    \raggedleft
    % Your date/SSIC formatting here
    \ifdefempty{\DocumentSSIC}{}{\DocumentSSIC\\}%
    \ifdefempty{\DocumentSerial}{}{\DocumentSerial\\}%
    \DocumentDate\par
    \endgroup
}


%=============================================================================
%                    ADDRESS BLOCK (From/To/Via/Subj)
%=============================================================================

\newcommand{\printAddressBlock}{%
    \begingroup
    \singlespacing
    \applyDocumentFontSize
    \noindent
    % Your From/To/Via/Subject formatting here
    % Use \FromLine, \ToLine, \ViaLineOne, \SubjectLine, etc.
    \endgroup
}


%=============================================================================
%                    SIGNATURE BLOCK
%=============================================================================

\newcommand{\printSignature}{%
    \par\vspace{48pt}%  % 4 blank lines below text
    \hspace{3.25in}%
    \begin{minipage}{3in}
        \raggedright
        % Digital signature field support
        \ifHasDigitalSigField
            \DigitalSignatureBox
        \else
            % Signature image support
            \ifNotEmpty{\SignatureImage}{%
                \IfFileExists{attachments/\SignatureImage}{%
                    \includegraphics[width=1.5in,height=0.5in,keepaspectratio]{attachments/\SignatureImage}\\[6pt]%
                }{}%
            }%
        \fi
        % Name and title
        \ifdefempty{\SignatoryAbbrev}{%
            \ifdefempty{\SignatoryName}{}{\MakeUppercase{\SignatoryName}\\}%
        }{\SignatoryAbbrev\\}%
        \optionalField{\ByDirection}%
    \end{minipage}
}


%=============================================================================
%                    PAGE STYLES
%=============================================================================

\fancypagestyle{firstpage}{%
    \fancyhf{}%
    \fancyhead[C]{\placeClassificationMarkings}%
    \fancyfoot[C]{}%  % No page number on first page
    \renewcommand{\headrulewidth}{0pt}%
    \renewcommand{\footrulewidth}{0pt}%
}

\fancypagestyle{documentpage}{%
    \fancyhf{}%
    \fancyhead[C]{\placeClassificationMarkings}%
    \fancyfoot[C]{\smartPageNumber}%
    \renewcommand{\headrulewidth}{0pt}%
    \renewcommand{\footrulewidth}{0pt}%
}
```

### Step 2: Add to latex-templates.js

Edit `src/lib/latex-templates.js` to include your new template. Add an entry to the templates object:

```javascript
export const latexTemplates = {
  // ... existing templates ...

  'templates/your_document_type.tex': `
    // Paste your template content here (escape backticks if any)
  `,
};
```

Also add the same entry to `public/lib/latex-templates.js` (they should stay in sync).

### Step 3: Register the Document Type

#### In `src/stores/documentStore.ts`

Add to the `DOCUMENT_TYPES` array:

```typescript
export const DOCUMENT_TYPES = [
  // ... existing types ...
  {
    value: 'your_document_type',
    label: 'Your Document Type',
    category: 'Letters' // or 'Memoranda', 'Endorsements', etc.
  },
];
```

#### In `src/lib/constants.ts`

Add to the `DOC_TYPES` object:

```typescript
export const DOC_TYPES = {
  // ... existing types ...
  your_document_type: {
    label: 'Your Document Type',
    description: 'Brief description',
    hasLetterhead: true,
    hasSignatureBlock: true,
  },
};
```

### Step 4: Handle Compliance Rules (Optional)

If your document type has specific compliance requirements, update `src/stores/documentStore.ts`:

```typescript
// In the getComplianceRules function or similar
case 'your_document_type':
  return {
    numberedParagraphs: true,  // or false
    referencesSection: true,
    enclosuresSection: true,
    salutation: false,
    complimentaryClose: false,
    dateFormat: 'military',  // or 'spelled'
  };
```

---

## Available Variables

Your template has access to these pre-defined variables:

### Document Metadata
| Variable | Description |
|----------|-------------|
| `\DocumentSSIC` | SSIC code |
| `\DocumentSerial` | Serial number |
| `\DocumentDate` | Document date |
| `\SubjectLine` | Subject line text |

### From Block
| Variable | Description |
|----------|-------------|
| `\FromLine` | First line of From block |
| `\FromLineTwo` | Second line |
| `\FromLineThree` | Third line |
| `\FromLineFour` | Fourth line |

### To Block
| Variable | Description |
|----------|-------------|
| `\ToLine` | First line of To block |
| `\ToLineTwo` | Second line |
| `\ToLineThree` | Third line |
| `\ToLineFour` | Fourth line |

### Via Block (check `\ifViaEnabled` first)
| Variable | Description |
|----------|-------------|
| `\ViaLineOne` | First via addressee |
| `\ViaLineTwo` | Second via addressee |
| `\ViaLineThree` | Third via addressee |
| `\ViaLineFour` | Fourth via addressee |

### Signatory
| Variable | Description |
|----------|-------------|
| `\SignatoryFirstName` | First name |
| `\SignatoryMiddleInitial` | Middle initial |
| `\SignatoryLastName` | Last name |
| `\SignatoryRank` | Rank |
| `\SignatoryTitle` | Title/billet |
| `\SignatoryName` | Full name |
| `\SignatoryAbbrev` | Abbreviated (J. M. SMITH) |
| `\SignatureImage` | Signature image filename |
| `\ByDirection` | By direction authority |

### Classification
| Variable | Description |
|----------|-------------|
| `\ifClassificationEnabled` | Any classification set |
| `\ifCUIEnabled` | CUI specifically |
| `\ifClassifiedEnabled` | Classified (C/S/TS) |
| `\ClassificationMarking` | The marking text |
| `\CUIControlledBy` | CUI controlled by |
| `\CUICategory` | CUI category |

### Business Letter Specific
| Variable | Description |
|----------|-------------|
| `\BusinessSalutation` | "Dear Mr./Ms.:" |
| `\BusinessClose` | "Sincerely," |
| `\BusinessDate` | Spelled date format |
| `\AttentionLine` | Attention line |

---

## Helper Commands

### Conditional Printing
```latex
\optionalLine{\SignatoryRank}         % Prints "Major\\" or nothing
\optionalField{\SignatoryTitle}        % Prints title or nothing (no newline)
\ifNotEmpty{\SignatureImage}{...}      % Execute block if non-empty
\ifNotEmptyElse{\Field}{if-set}{if-empty}  % Branch based on value
\ifdefempty{\Field}{if-empty}{if-set}      % etoolbox check
```

### Font Handling
```latex
\applyDocumentFontSize    % Apply user's font size setting
\applyFontSettings        % Apply both size and family
```

### Classification Markings
```latex
\placeClassificationMarkings  % Place header/footer markings
```

---

## Testing Your Template

1. Start the dev server: `npm run dev`
2. Select your new document type from the dropdown
3. Fill in the form fields
4. Check the PDF preview for correct formatting
5. Test with various configurations:
   - With/without Via addressees
   - With/without references and enclosures
   - With/without classification markings
   - With/without signature image

### Debugging Tips

- Check browser console for LaTeX compilation errors
- Use `DONDOCS.texlive.summary()` in console to see TeX Live file requests
- Look for "Undefined control sequence" errors if a command is missing
- Check that all `\begin{...}` have matching `\end{...}`

---

## Example: Simple Memo Template

Here's a minimal example of a plain paper memo:

```latex
%=============================================================================
%                     PLAIN PAPER MEMO
%=============================================================================

\newcommand{\printDateAndTitle}{%
    \begingroup
    \applyDocumentFontSize
    \centering
    \textbf{MEMORANDUM}\\[12pt]
    \DocumentDate\par
    \endgroup
}

\newcommand{\printAddressBlock}{%
    \begingroup
    \applyDocumentFontSize
    \noindent
    \begin{tabular}{@{}l@{}p{5.5in}@{}}
        From: & \FromLine\\
        To: & \ToLine\\[12pt]
        Subj: & \SubjectLine
    \end{tabular}
    \endgroup
}

\newcommand{\printSignature}{%
    \par\vspace{36pt}
    \noindent\SignatoryName\\
    \SignatoryTitle
}

\fancypagestyle{firstpage}{\fancyhf{}\renewcommand{\headrulewidth}{0pt}}
\fancypagestyle{documentpage}{\fancyhf{}\fancyfoot[C]{\thepage}\renewcommand{\headrulewidth}{0pt}}
```

---

## Questions?

- Check existing templates in `tex/templates/` for examples
- Refer to `tex/README.md` for SECNAV M-5216.5 formatting rules
- Open an issue on GitHub if you need help
