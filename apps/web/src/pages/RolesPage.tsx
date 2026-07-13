import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Shield, Plus, Edit2, Trash2, X, Save, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isDeletable: boolean;
  userCount: number;
  permissions: string[];
}

interface Permission {
  id: string;
  module: string;
  action: string;
}

export function RolesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showPerms, setShowPerms] = useState<string | null>(null);

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data.data;
    },
  });

  const { data: allPermissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get('/roles/permissions');
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const groupedPerms = allPermissions?.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {}) || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Roles & Permissions</h1>
        </div>
        <button
          onClick={() => { setEditingRole(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Add Role
        </button>
      </div>

      {showForm && (
        <RoleForm
          role={editingRole}
          allPermissions={allPermissions || []}
          onClose={() => { setShowForm(false); setEditingRole(null); }}
          onSuccess={() => { setShowForm(false); setEditingRole(null); queryClient.invalidateQueries({ queryKey: ['roles'] }); }}
        />
      )}

      {showPerms && (
        <PermissionEditor
          roleId={showPerms}
          allPermissions={allPermissions || []}
          currentPermissions={roles?.find(r => r.id === showPerms)?.permissions || []}
          onClose={() => setShowPerms(null)}
          onSuccess={() => { setShowPerms(null); queryClient.invalidateQueries({ queryKey: ['roles'] }); }}
        />
      )}

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <div className="space-y-4">
          {roles?.map(role => (
            <div key={role.id} className="rounded-lg bg-white shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900">{role.name}</h3>
                    {!role.isDeletable && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-800">
                        System
                      </span>
                    )}
                    <span className="text-sm text-gray-500">{role.userCount} users</span>
                  </div>
                  {role.description && <p className="text-sm text-gray-500 mt-1">{role.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {role.permissions.slice(0, 8).map(p => (
                      <span key={p} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {p}
                      </span>
                    ))}
                    {role.permissions.length > 8 && (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        +{role.permissions.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPerms(role.id)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Permissions
                  </button>
                  {role.isDeletable && (
                    <>
                      <button
                        onClick={() => { setEditingRole(role); setShowForm(true); }}
                        className="rounded p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Delete this role?')) deleteMutation.mutate(role.id); }}
                        className="rounded p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleForm({ role, allPermissions, onClose, onSuccess }: { role: Role | null; allPermissions: Permission[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissionIds: [] as string[],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (role) return api.patch(`/roles/${role.id}`, { name: data.name, description: data.description });
      return api.post('/roles', data);
    },
    onSuccess,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">{role ? 'Edit Role' : 'Add Role'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {role ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionEditor({ roleId, allPermissions, currentPermissions, onClose, onSuccess }: {
  roleId: string; allPermissions: Permission[]; currentPermissions: string[]; onClose: () => void; onSuccess: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentPermissions));

  const updateMutation = useMutation({
    mutationFn: async (permissionIds: string[]) => {
      return api.put(`/roles/${roleId}/permissions`, { permissionIds });
    },
    onSuccess,
  });

  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const toggle = (perm: string) => {
    const next = new Set(selected);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    setSelected(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Edit Permissions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          {Object.entries(grouped).map(([module, perms]) => (
            <div key={module} className="rounded-md border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">{module}</h3>
              <div className="grid grid-cols-2 gap-2">
                {perms.map(p => {
                  const perm = `${p.module}:${p.action}`;
                  const checked = selected.has(perm);
                  return (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer">
                      <div
                        className={cn(
                          'h-5 w-5 rounded border-2 flex items-center justify-center',
                          checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                        )}
                        onClick={() => toggle(perm)}
                      >
                        {checked && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm text-gray-700" onClick={() => toggle(perm)}>{p.action}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => updateMutation.mutate(Array.from(selected))}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
}
