import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Copy, Code, ArrowLeft, Trash2 } from 'lucide-react';

export default function FormDetails({ apiBase, token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/forms/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()),
      fetch(`${apiBase}/api/forms/${id}/submissions`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()),
    ])
    .then(([formRes, subsRes]) => {
      setForm(formRes.form);
      setFields(formRes.fields);
      setSubmissions(subsRes);
      setLoading(false);
    })
    .catch(console.error);
  }, [apiBase, id, token]);

  if (loading) return <div className="flex-center"><span className="loader" style={{borderColor:'var(--accent)', borderTopColor:'transparent'}}></span></div>;
  if (!form) return <div className="empty-state">Form not found</div>;

  const snippet = `<script src="${apiBase}/widget/widget.iife.js" data-form-id="${form.id}" data-api-base="${apiBase}"></script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this form and all its responses? This cannot be undone.')) return;
    try {
      const res = await fetch(`${apiBase}/api/forms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        navigate('/');
      } else {
        alert('Failed to delete the form.');
      }
    } catch(err) { console.error(err); }
  };

  const handleExport = () => {
    fetch(`${apiBase}/api/forms/${id}/export`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `form_${form.id}_export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch(err => console.error('Export error:', err));
  };

  // Compute stats
  const totalSubmissions = submissions.length;
  let avgRating = 0;
  
  // Find if rating/nps field exists
  const ratingField = fields.find(f => f.type === 'rating' || f.type === 'nps');
  if (ratingField && totalSubmissions > 0) {
    const sum = submissions.reduce((acc, s) => {
      const val = parseInt(s.data[ratingField.label]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    avgRating = (sum / totalSubmissions).toFixed(1);
  }

  // Chart data: group by date
  const chartDataMap = {};
  submissions.forEach(s => {
    const d = new Date(s.submitted_at).toLocaleDateString();
    chartDataMap[d] = (chartDataMap[d] || 0) + 1;
  });
  const chartData = Object.keys(chartDataMap).sort((a,b) => new Date(a) - new Date(b)).map(k => ({ date: k, count: chartDataMap[k] }));

  return (
    <div>
      <div style={{marginBottom: '1rem'}}>
        <button className="secondary" onClick={() => navigate('/')} style={{padding: '0.5rem 1rem'}}>
          <ArrowLeft size={16} style={{marginRight:'0.5rem'}}/> Back
        </button>
      </div>

      <div className="panel" style={{marginBottom: '2rem'}}>
        <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem'}}>
          <h2 style={{margin:0, color: form.theme_color, background:'var(--accent-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>{form.title} - Management</h2>
          <div style={{display:'flex', gap:'1rem', flexWrap:'wrap'}}>
            <button className="danger" onClick={handleDelete}><Trash2 size={16} style={{marginRight:'0.5rem'}}/> Delete Form</button>
            <button className="secondary" onClick={handleExport}><Download size={16} style={{marginRight:'0.5rem'}}/> Export CSV</button>
          </div>
        </div>
        
        <div style={{background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display:'flex', alignItems:'center', gap:'1rem'}}>
          <Code size={24} color="var(--text-secondary)" />
          <div style={{flex: 1}}>
            <div style={{fontSize:'0.875rem', fontWeight:600, marginBottom:'0.25rem'}}>Embed Snippet</div>
            <code style={{display:'block', padding:'0.75rem', background:'var(--panel-bg)', borderRadius:'0.375rem', border:'1px solid var(--border)', fontSize:'0.75rem', wordBreak:'break-all'}}>
              {snippet}
            </code>
          </div>
          <button onClick={copySnippet} style={{alignSelf:'flex-end'}}>
            {copied ? 'Copied!' : <><Copy size={16} /> Copy</>}
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Total Submissions</div>
          <div className="value">{totalSubmissions}</div>
        </div>
        {ratingField && (
          <div className="stat-card">
            <div className="label">Avg {ratingField.type === 'nps' ? 'NPS' : 'Rating'} Score</div>
            <div className="value">{avgRating} {ratingField.type === 'rating' ? '/ 5' : ''}</div>
          </div>
        )}
      </div>

      <div className="panel" style={{marginBottom: '2rem'}}>
        <h3 style={{marginTop:0}}>Submissions Trend</h3>
        {chartData.length > 0 ? (
          <div style={{height: 300}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                <Tooltip contentStyle={{background: 'var(--panel-bg)', borderColor: 'var(--border)'}} />
                <Line type="monotone" dataKey="count" stroke={form.theme_color} strokeWidth={3} dot={{r: 5}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="empty-state" style={{padding:'2rem'}}>Not enough data</div>}
      </div>

      <div className="panel">
        <h3 style={{marginTop:0}}>Detailed Responses</h3>
        {submissions.length === 0 ? (
          <div className="empty-state" style={{padding:'2rem'}}>No submissions yet. Check back later!</div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {fields.map(f => <th key={f.id}>{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id}>
                    <td style={{whiteSpace:'nowrap'}}>{new Date(s.submitted_at).toLocaleString()}</td>
                    {fields.map(f => {
                      const val = s.data[f.label];
                      return (
                        <td key={f.id}>
                          {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
