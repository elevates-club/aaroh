import { useRole } from '@/contexts/RoleContext';
import { getRoleLabel } from '@/lib/constants';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Shield } from 'lucide-react';

export function RoleSwitcher() {
    const { activeRole, setActiveRole, availableRoles } = useRole();

    // Only show if user has multiple roles
    if (availableRoles.length <= 1) {
        return null;
    }

    return (
        <>
            {/* Desktop version */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-muted/30">
                <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Acting as:</span>
                    <Select value={activeRole} onValueChange={setActiveRole}>
                        <SelectTrigger className="h-7 w-[180px] text-xs border-0 bg-transparent focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableRoles.map((role) => (
                                <SelectItem key={role} value={role} className="text-xs">
                                    {getRoleLabel(role)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Mobile version - compact icon button */}
            <div className="flex md:hidden">
                <Select value={activeRole} onValueChange={setActiveRole}>
                    <SelectTrigger className="h-9 w-9 p-0 border-0 bg-muted/30 hover:bg-muted/50 rounded-full">
                        <Shield className="w-4 h-4 text-primary" />
                    </SelectTrigger>
                    <SelectContent align="end">
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium border-b">
                            Switch Role
                        </div>
                        {availableRoles.map((role) => (
                            <SelectItem key={role} value={role} className="text-sm">
                                {getRoleLabel(role)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}
