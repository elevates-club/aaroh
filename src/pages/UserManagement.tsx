import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Pencil, Trash2, Eye, Search, ArrowUpDown, Filter } from 'lucide-react';
import { USER_ROLES, getRoleLabel } from '@/lib/constants';
import { logUserManagementActivity } from '@/utils/activityLogger';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string[];
    created_at: string;
    user_id: string;
}

export default function UserManagement() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' }>({
        key: 'created_at',
        direction: 'desc'
    });

    // Dialog states
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        roles: [USER_ROLES.FIRST_YEAR_COORDINATOR] as string[],
        password: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data as User[] || []);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch users',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        try {
            setLoading(true);

            // Security Check: Event Managers cannot create Admins
            if (isEventManager && !isAdmin && formData.roles.includes(USER_ROLES.ADMIN)) {
                throw new Error("Insufficient permissions: Event Managers cannot create Admin accounts.");
            }

            // Call Admin RPC to create user securely
            const { data, error } = await supabase.rpc('create_user_by_admin' as any, {
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                role: formData.roles[0]
            }) as { data: any, error: any };

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            toast({
                title: 'Success',
                description: 'User created successfully.',
            });

            if (profile?.id) {
                await logUserManagementActivity(profile.id, 'user_created', {
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.roles[0]
                });
            }

            setShowAddDialog(false);
            resetForm();
            fetchUsers();
        } catch (error: any) {
            console.error('Error adding user:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to add user',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;

        try {
            setLoading(true);

            // Security Check: Event Managers cannot assign Admin role
            if (isEventManager && !isAdmin && formData.roles.includes(USER_ROLES.ADMIN)) {
                throw new Error("Insufficient permissions: Event Managers cannot assign Admin role.");
            }

            // Security Check: Event Managers cannot edit existing Admins (should be blocked by UI but double check)
            const targetIsAdmin = Array.isArray(selectedUser.role) ? selectedUser.role.includes(USER_ROLES.ADMIN) : selectedUser.role === USER_ROLES.ADMIN;
            if (isEventManager && !isAdmin && targetIsAdmin) {
                throw new Error("Insufficient permissions: Event Managers cannot edit Admin accounts.");
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.roles
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'User updated successfully',
            });

            if (profile?.id) {
                await logUserManagementActivity(profile.id, 'user_updated', {
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.roles,
                    target_user_id: selectedUser.id
                });
            }

            setShowEditDialog(false);
            resetForm();
            fetchUsers();
        } catch (error: any) {
            console.error('Error updating user:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update user',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            setLoading(true);

            // Call Admin RPC to delete user securely (removes auth + profile + logs)
            const { data, error } = await supabase.rpc('delete_user_by_admin' as any, {
                target_user_id: selectedUser.id
            }) as { data: any, error: any };

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            toast({
                title: 'Success',
                description: 'User account and profile deleted successfully.',
            });

            if (profile?.id) {
                await logUserManagementActivity(profile.id, 'user_deleted', {
                    email: selectedUser.email,
                    full_name: selectedUser.full_name,
                    target_user_id: selectedUser.id
                });
            }

            setShowDeleteDialog(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete user',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const openEditDialog = (user: User) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            full_name: user.full_name,
            roles: Array.isArray(user.role) ? user.role : [user.role],
            password: ''
        });
        setShowEditDialog(true);
    };

    const openDeleteDialog = (user: User) => {
        setSelectedUser(user);
        setShowDeleteDialog(true);
    };

    const openDetailsDialog = (user: User) => {
        setSelectedUser(user);
        setShowDetailsDialog(true);
    };

    const resetForm = () => {
        setFormData({
            email: '',
            full_name: '',
            roles: [USER_ROLES.FIRST_YEAR_COORDINATOR],
            password: ''
        });
        setSelectedUser(null);
    };

    const toggleRole = (role: string) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role]
        }));
    };

    const isEventManager = profile?.role && (Array.isArray(profile.role) ? profile.role.includes(USER_ROLES.EVENT_MANAGER) : profile.role === USER_ROLES.EVENT_MANAGER);
    const isAdmin = profile?.role && (Array.isArray(profile.role) ? profile.role.includes(USER_ROLES.ADMIN) : profile.role === USER_ROLES.ADMIN);

    const filteredUsers = users
        .filter(user => {
            const roles = Array.isArray(user.role) ? user.role : [user.role];

            // Event Managers cannot see Admins
            if (isEventManager && !isAdmin && roles.includes(USER_ROLES.ADMIN)) {
                return false;
            }

            // Role Filtering
            if (roleFilter !== 'all') {
                if (!roles.includes(roleFilter)) return false;
            }

            const roleLabels = roles.map(r => getRoleLabel(r)).join(' ');
            return user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                roleLabels.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const handleSort = (key: keyof User) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    if (!isAdmin && !isEventManager) {
        return (
            <div className="p-8 text-center">
                <p className="text-muted-foreground">Access denied. Admin or Event Manager only.</p>
            </div>
        );
    }

    const getRoleDisplay = (roles: string | string[]) => {
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.map(r => getRoleLabel(r)).join(', ');
    };

    return (
        <div className="w-full max-w-[100vw] px-4 py-6 md:container md:mx-auto md:p-6 space-y-6 overflow-x-hidden">
            <Card className="max-w-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-6 h-6" />
                                User Management
                            </CardTitle>
                            <CardDescription>Manage system users and their roles</CardDescription>
                        </div>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add User
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users by name, email, or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="w-full md:w-[250px]">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger>
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="Filter by Role" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value={USER_ROLES.ADMIN}>Admin</SelectItem>
                                    <SelectItem value={USER_ROLES.EVENT_MANAGER}>Event Manager</SelectItem>
                                    <SelectItem value={USER_ROLES.FIRST_YEAR_COORDINATOR}>1st Year Coord</SelectItem>
                                    <SelectItem value={USER_ROLES.SECOND_YEAR_COORDINATOR}>2nd Year Coord</SelectItem>
                                    <SelectItem value={USER_ROLES.THIRD_YEAR_COORDINATOR}>3rd Year Coord</SelectItem>
                                    <SelectItem value={USER_ROLES.FOURTH_YEAR_COORDINATOR}>4th Year Coord</SelectItem>
                                    <SelectItem value={USER_ROLES.STUDENT}>Student</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="border rounded-lg w-full max-w-[calc(100vw-3rem)] overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('full_name')}>
                                        <div className="flex items-center gap-2">
                                            Name
                                            {sortConfig.key === 'full_name' && <ArrowUpDown className="w-3 h-3" />}
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('email')}>
                                        <div className="flex items-center gap-2">
                                            Email
                                            {sortConfig.key === 'email' && <ArrowUpDown className="w-3 h-3" />}
                                        </div>
                                    </TableHead>
                                    <TableHead>Roles</TableHead>
                                    <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center gap-2">
                                            Created
                                            {sortConfig.key === 'created_at' && <ArrowUpDown className="w-3 h-3" />}
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Loading users...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.full_name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(Array.isArray(user.role) ? user.role : [user.role]).map((r) => (
                                                        <span key={r} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                            {getRoleLabel(r)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDetailsDialog(user)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(user)}
                                                        disabled={isEventManager && !isAdmin && (Array.isArray(user.role) ? user.role.includes('admin') : user.role === 'admin')}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(user)}
                                                        disabled={user.id === profile?.id || (isEventManager && !isAdmin && (Array.isArray(user.role) ? user.role.includes('admin') : user.role === 'admin'))}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit User Dialogs - Role Selector Component */}
            {[
                { open: showAddDialog, onOpenChange: setShowAddDialog, title: 'Add New User', description: 'Create a new user account', onSubmit: handleAddUser, showPassword: true },
                { open: showEditDialog, onOpenChange: setShowEditDialog, title: 'Edit User', description: 'Update user information', onSubmit: handleEditUser, showPassword: false }
            ].map((dialog, idx) => (
                <Dialog key={idx} open={dialog.open} onOpenChange={dialog.onOpenChange}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{dialog.title}</DialogTitle>
                            <DialogDescription>{dialog.description}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`${idx}-name`}>Full Name</Label>
                                    <Input
                                        id={`${idx}-name`}
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`${idx}-email`}>Email</Label>
                                    <Input
                                        id={`${idx}-email`}
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="coordinator@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Select Roles</Label>
                                <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                                    {[
                                        { value: USER_ROLES.ADMIN, label: 'Admin' },
                                        { value: USER_ROLES.EVENT_MANAGER, label: 'Event Manager' },
                                        { value: USER_ROLES.FIRST_YEAR_COORDINATOR, label: '1st Year' },
                                        { value: USER_ROLES.SECOND_YEAR_COORDINATOR, label: '2nd Year' },
                                        { value: USER_ROLES.THIRD_YEAR_COORDINATOR, label: '3rd Year' },
                                        { value: USER_ROLES.FOURTH_YEAR_COORDINATOR, label: '4th Year' },
                                        { value: USER_ROLES.STUDENT, label: 'Student' },
                                    ]
                                        .filter(role => isAdmin || role.value !== USER_ROLES.ADMIN)
                                        .map((role) => {
                                            const isSelected = formData.roles.includes(role.value);
                                            return (
                                                <button
                                                    key={role.value}
                                                    type="button"
                                                    onClick={() => toggleRole(role.value)}
                                                    className={`
                                                        px-3 py-1.5 rounded-full text-sm font-medium transition-all
                                                        ${isSelected
                                                            ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                                                            : 'bg-background border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                        }
                                                    `}
                                                >
                                                    {role.label}
                                                </button>
                                            );
                                        })}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Click to toggle roles. At least one role must be selected.
                                </p>
                            </div>

                            {dialog.showPassword && (
                                <div className="space-y-2">
                                    <Label htmlFor={`${idx}-password`}>Password</Label>
                                    <Input
                                        id={`${idx}-password`}
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Minimum 8 characters"
                                    />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => dialog.onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={dialog.onSubmit} disabled={loading || formData.roles.length === 0}>
                                {dialog.title.includes('Add') ? 'Create User' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ))}

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this user? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="py-4">
                            <p className="text-sm">
                                <strong>Name:</strong> {selectedUser.full_name}
                            </p>
                            <p className="text-sm">
                                <strong>Email:</strong> {selectedUser.email}
                            </p>
                            <p className="text-sm">
                                <strong>Roles:</strong> {getRoleDisplay(selectedUser.role)}
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={loading}>
                            Delete User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                                    <p className="font-medium">{selectedUser.full_name}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Email</Label>
                                    <p className="font-medium">{selectedUser.email}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs text-muted-foreground">Roles</Label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(Array.isArray(selectedUser.role) ? selectedUser.role : [selectedUser.role]).map((r) => (
                                            <span key={r} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                {getRoleLabel(r)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">User ID</Label>
                                    <p className="font-mono text-xs">{selectedUser.user_id}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs text-muted-foreground">Created At</Label>
                                    <p className="font-medium">{new Date(selectedUser.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
