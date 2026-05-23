import type { Profile } from '../../lib/database.types';

interface Props {
  profiles: Profile[];
  onRoleChange: (userId: string, newRole: string) => void;
}

export default function AdminUsersTab({ profiles, onRoleChange }: Props) {
  return (
    <div className="table-responsive">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Email</th>
            <th>Nazwa</th>
            <th>Rola</th>
            <th>Aktywny</th>
            <th>Zmień rolę</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id}>
              <td>{p.email}</td>
              <td>{p.full_name || '—'}</td>
              <td>
                <span className="badge bg-info">{p.role}</span>
              </td>
              <td>
                <span className={`badge bg-${p.is_active ? 'success' : 'danger'}`}>
                  {p.is_active ? 'Tak' : 'Nie'}
                </span>
              </td>
              <td>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 140 }}
                  value={p.role}
                  onChange={(e) => onRoleChange(p.id, e.target.value)}
                >
                  <option value="user">user</option>
                  <option value="kitchen">kitchen</option>
                  <option value="courier">courier</option>
                  <option value="admin">admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
