import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function ActivityPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api_admin_activity.php', { headers: { 'X-Admin-Token': token } })
      .then(({ data }) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load activity.'));
  }, [token]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Activity</h1>
          <p>Recent changes by admin users</p>
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {!error && entries.length === 0 && <p>No changes recorded yet.</p>}
      <div className="users-list">
        {entries.map((entry, index) => (
          <div className="user-card" key={`${entry.created_at}-${index}`}>
            <div className="user-info">
              <div className="user-name">{entry.admin_name}</div>
              <div>{entry.action} {entry.subject}{entry.subject_id ? ` #${entry.subject_id}` : ''}</div>
            </div>
            <time className="user-email" dateTime={entry.created_at}>
              {entry.created_at}
            </time>
          </div>
        ))}
      </div>
    </div>
  );
}
