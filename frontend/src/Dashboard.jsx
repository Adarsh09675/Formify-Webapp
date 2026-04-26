import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, FileText, Trash2 } from 'lucide-react';

export default function Dashboard({ apiBase, token }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${apiBase}/api/forms`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      setForms(data);
      setLoading(false);
    })
    .catch(console.error);
  }, [apiBase, token]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this form and all its responses? This cannot be undone.')) return;
    try {
      const res = await fetch(`${apiBase}/api/forms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setForms(forms.filter(f => f.id !== id));
      } else {
        alert('Failed to delete the form.');
      }
    } catch(err) { console.error(err); }
  };

  if (loading) return <div className="flex-center"><span className="loader" style={{borderColor:'var(--accent)', borderTopColor:'transparent'}}></span></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Your Forms</h2>
        <button onClick={() => navigate('/build')}><PlusCircle size={18} style={{marginRight:'0.5rem'}}/> Create Form</button>
      </div>

      {forms.length === 0 ? (
        <div className="empty-state">
          <h3>No forms created yet</h3>
          <p>Create your first form to start collecting feedback!</p>
          <button style={{marginTop: '1rem'}} onClick={() => navigate('/build')}>Get Started</button>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem'}}>
          {forms.map(f => (
            <div key={f.id} className="panel panel-hoverable" style={{padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column'}} onClick={() => navigate(`/form/${f.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <FileText size={20} color={f.theme_color} style={{ flexShrink: 0 }} /> 
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</span>
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/edit/${f.id}`); }} 
                    className="secondary" 
                    style={{ padding: '0.5rem', borderRadius: '0.5rem', minWidth: '40px', height: '40px' }}
                    title="Edit Form"
                  >
                    <FileText size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, f.id)} 
                    className="danger" 
                    style={{ padding: '0.5rem', borderRadius: '0.5rem', minWidth: '40px', height: '40px' }}
                    title="Delete Form"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem'}}>
                Created: {new Date(f.created_at).toLocaleDateString()}
              </div>
              
              <div style={{marginTop: 'auto'}}>
                <div style={{background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid var(--border)'}}>
                  <div style={{fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)'}}>{f.submissions_count}</div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Responses</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
