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
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem'}}>
          {forms.map(f => (
            <div key={f.id} className="panel panel-hoverable" style={{padding: '1.5rem', cursor: 'pointer', position: 'relative'}} onClick={() => navigate(`/form/${f.id}`)}>
              <button 
                onClick={(e) => handleDelete(e, f.id)} 
                className="danger remove-btn" 
                style={{position:'absolute', top:'1rem', right:'1rem', padding:'0.5rem', borderRadius:'0.5rem', display:'flex', alignItems:'center', justifyContent:'center'}}
                title="Delete Form"
              >
                <Trash2 size={16} />
              </button>
              <h3 style={{marginTop:0, marginRight:'2rem', display:'flex', alignItems:'center', gap:'0.5rem'}}><FileText size={20} color={f.theme_color}/> {f.title}</h3>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem'}}>
                Created: {new Date(f.created_at).toLocaleDateString()}
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                <div style={{flex: 1, background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center'}}>
                  <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)'}}>{f.submissions_count}</div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Responses</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
