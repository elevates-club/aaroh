#!/bin/bash
# Fix all files that need hasRole import

FILES=(
  "src/pages/ActivityLogs.tsx"
  "src/pages/Events.tsx"
  "src/pages/Registrations.tsx"
  "src/pages/Settings.tsx"
  "src/components/PDFDownloadButton.tsx"
  "src/components/RegistrationStats.tsx"
  "src/components/forms/StudentRegistrationForm.tsx"
  "src/components/layout/AppSidebar.tsx"
  "src/components/layout/Header.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Skip if already has hasRole import
    if grep -q "import.*hasRole" "$file"; then
      echo "✓ $file already has hasRole import"
      continue
    fi
    
    # Add import after @/lib/constants if it exists
    if grep -q "from '@/lib/constants'" "$file"; then
      sed -i.bak "/from '@\/lib\/constants'/a\\
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
" "$file" && rm "$file.bak"
      echo "✓ Added import to $file"
    fi
  fi
done

echo "✅ All imports added"
