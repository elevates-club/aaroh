// Updated utility functions for role switching support

export type UserRole = string | string[];

/**
 * Check if user has a specific role
 * Works with both single role and role arrays
 */
export const hasRole = (userRole: UserRole | undefined, targetRole: string): boolean => {
    if (!userRole) return false;
    if (Array.isArray(userRole)) {
        return userRole.includes(targetRole);
    }
    return userRole === targetRole;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (userRole: UserRole | undefined, targetRoles: string[]): boolean => {
    if (!userRole) return false;
    if (Array.isArray(userRole)) {
        return targetRoles.some(role => userRole.includes(role));
    }
    return targetRoles.includes(userRole);
};

/**
 * Get coordinator year from role(s)
 * Returns the first coordinator year found in roles
 * If specific role provided (from active role), uses that
 */
export const getCoordinatorYear = (userRole: UserRole | undefined): string | null => {
    if (!userRole) return null;

    // If it's a single role string, extract year from it
    if (!Array.isArray(userRole)) {
        if (!userRole.includes('_coordinator')) return null;
        return userRole.replace('_coordinator', '').replace('_year', '');
    }

    // If array, find first coordinator role
    const coordinatorRole = userRole.find(role => role.includes('_coordinator'));
    if (!coordinatorRole) return null;

    return coordinatorRole.replace('_coordinator', '').replace('_year', '');
};

/**
 * Get display label for role(s)
 * Returns comma-separated labels if multiple roles
 */
export const getRoleDisplay = (userRole: UserRole | undefined, getRoleLabel: (role: string) => string): string => {
    if (!userRole) return '';

    const roles = Array.isArray(userRole) ? userRole : [userRole];
    return roles.map(r => getRoleLabel(r)).join(', ');
};
