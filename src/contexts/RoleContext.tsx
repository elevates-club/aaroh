import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface RoleContextType {
    activeRole: string;
    setActiveRole: (role: string) => void;
    availableRoles: string[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
    const { profile } = useAuth();
    const [activeRole, setActiveRole] = useState<string>('');

    const availableRoles = Array.isArray(profile?.role)
        ? profile.role
        : profile?.role
            ? [profile.role]
            : [];

    // Initialize active role when user loads or changes
    useEffect(() => {
        if (availableRoles.length > 0) {
            // Set to first role if not already set or if current activeRole is not in available roles
            if (!activeRole || !availableRoles.includes(activeRole)) {
                console.log('🔄 Setting active role to:', availableRoles[0]);
                setActiveRole(availableRoles[0]);
            }
        } else {
            setActiveRole('');
        }
    }, [availableRoles.join(','), profile?.id]); // Use join to detect array changes

    // Log role changes for debugging
    useEffect(() => {
        console.log('✅ Active role changed to:', activeRole);
        console.log('📋 Available roles:', availableRoles);
    }, [activeRole]);

    return (
        <RoleContext.Provider value={{ activeRole, setActiveRole, availableRoles }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const context = useContext(RoleContext);
    if (context === undefined) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
}
