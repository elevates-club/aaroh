#!/bin/bash
# Batch update files to add useRole import and use activeRole

FILES=(
  "src/pages/Registrations.tsx"
  "src/pages/Settings.tsx"
  "src/pages/Events.tsx"
  "src/pages/ActivityLogs.tsx"
  "src/components/PDFDownloadButton.tsx"
  "src/components/RegistrationStats.tsx"
  "src/components/forms/StudentRegistrationForm.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."
    
    # Add useRole import after useAuth
    sed -i.bak "/import { useAuth } from '@\/contexts\/AuthContext';/a\\
import { useRole } from '@/contexts/RoleContext';
" "$file"
    
    # Add activeRole const after profile
    sed -i.bak "/const { profile } = useAuth();/a\\
  const { activeRole } = useRole();
" "$file"
    
    # Replace profile?.role with activeRole in permission checks
    sed -i.bak "s/hasRole(profile\?\.role,/hasRole(activeRole,/g" "$file"
    sed -i.bak "s/getCoordinatorYear(profile\?\.role)/getCoordinatorYear(activeRole)/g" "$file"
    
    rm "$file.bak" 2>/dev/null
    echo "✓ Updated $file"
  fi
done

echo "✅ All files updated to use activeRole"
