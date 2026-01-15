import { ClipboardList, Construction } from 'lucide-react';

export function Form6105Section() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <ClipboardList className="h-5 w-5" />
        NAVPERS 6105/1 - Page 13 Entry
      </div>

      <div className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg p-8 text-center bg-amber-50/50 dark:bg-amber-950/20">
        <Construction className="h-12 w-12 mx-auto mb-4 text-amber-500" />
        <h3 className="text-lg font-medium text-amber-700 dark:text-amber-400 mb-2">
          Form Coming Soon
        </h3>
        <p className="text-sm text-amber-600 dark:text-amber-500 max-w-md mx-auto">
          The NAVPERS 6105/1 (Page 13 Entry) form editor is under development.
          This will allow you to create counseling and administrative remarks
          entries for service record pages.
        </p>
      </div>
    </div>
  );
}
