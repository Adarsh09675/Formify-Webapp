import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Save } from 'lucide-react';

export default function FormBuilder({ apiBase, token }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('My Feedback Form');
  const [themeColor, setThemeColor] = useState('#4F46E5');
  const [position, setPosition] = useState('floating-right');
  const [webhookUrl, setWebhookUrl] = useState('');

  const [fields, setFields] = useState([
    { type: 'rating', label: 'How would you rate your experience?', is_required: true },
    { type: 'text', label: 'Any additional comments?', is_required: false, max_length: 500 }
  ]);

  const [saving, setSaving] = useState(false);

  // A very basic preview UI, not full isolation, just visually similar
  const Preview = () => {
    return (
      <div className="panel" style={{ position: 'sticky', top: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Live Preview</h3>
        <div style={{ border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', background: 'var(--bg-color)' }}>
          <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '0.75rem', borderStyles: 'solid', borderWidth: '1px', borderColor: 'var(--border)' }}>
            <h4 style={{ marginTop: 0, color: themeColor }}>{title}</h4>
            {fields.map((f, i) => (
              <div key={i} style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  {f.label} {f.is_required && <span style={{ color: 'red' }}>*</span>}
                </label>
                {f.type === 'text' && <input type="text" disabled placeholder="Text input" style={{ width: '100%', padding: '0.5rem' }} />}
                {f.type === 'dropdown' && <select disabled style={{ width: '100%', padding: '0.5rem' }}><option>Dropdown...</option></select>}
                {(f.type === 'rating' || f.type === 'nps') && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map(x => <div key={x} style={{ width: '40px', height: '40px', border: '1px solid var(--border)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>{x}</div>)}
                  </div>
                )}
                {f.type === 'checkbox' && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="checkbox" disabled /> <span style={{ fontSize: '0.875rem' }}>{f.label}</span>
                  </div>
                )}
              </div>
            ))}
            <button style={{ width: '100%', background: themeColor }}>Submit</button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Widget Mode: <strong>{position}</strong>
          </div>
        </div>
      </div>
    );
  };

  const addField = (type) => {
    setFields([...fields, { type, label: 'New Field', is_required: false }]);
  };

  const updateField = (index, key, val) => {
    const fn = [...fields];
    fn[index][key] = val;
    setFields(fn);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formattedFields = fields.map(f => {
        if (f.type === 'dropdown' && Array.isArray(f.options)) {
          return { ...f, options: f.options.map(s => s.trim()).filter(Boolean) };
        }
        return f;
      });
      const res = await fetch(`${apiBase}/api/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          theme_color: themeColor,
          widget_position: position,
          webhook_url: webhookUrl,
          fields: formattedFields
        })
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/form/${data.formId}`);
      } else {
        alert("Failed: " + JSON.stringify(data.error));
      }
    } catch (e) {
      alert("Error saving form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-builder">
      <div>
        <div className="panel" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>General Settings</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Form Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Theme Color</label>
              <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ padding: '0.25rem', height: '44px' }} />
            </div>
            <div className="form-group">
              <label>Widget Display</label>
              <select value={position} onChange={e => setPosition(e.target.value)}>
                <option value="floating-right">Floating (Bottom Right)</option>
                <option value="floating-left">Floating (Bottom Left)</option>
                <option value="inline">Inline (Embed block)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Webhook URL (Optional)</label>
              <input type="url" placeholder="https://..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Fields Config</h2>

          {fields.map((f, i) => (
            <div key={i} className="field-item">
              <button className="remove-btn" onClick={() => removeField(i)}>X</button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Field Type</label>
                  <select value={f.type} onChange={e => updateField(i, 'type', e.target.value)}>
                    <option value="text">Text / TextArea</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="rating">Rating (1-5)</option>
                    <option value="nps">NPS (0-10)</option>
                  </select>
                </div>
                <div>
                  <label>Label / Question</label>
                  <input value={f.label} onChange={e => updateField(i, 'label', e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <input type="checkbox" checked={f.is_required} onChange={e => updateField(i, 'is_required', e.target.checked)} style={{ width: 'auto' }} />
                  Required
                </label>

                {f.type === 'text' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ margin: 0 }}>Min Len:</label>
                      <input type="number" style={{ width: '80px', padding: '0.25rem' }} value={f.min_length || ''} onChange={e => updateField(i, 'min_length', e.target.value === '' ? undefined : parseInt(e.target.value))} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ margin: 0 }}>Max Len:</label>
                      <input type="number" style={{ width: '80px', padding: '0.25rem' }} value={f.max_length || ''} onChange={e => updateField(i, 'max_length', e.target.value === '' ? undefined : parseInt(e.target.value))} />
                    </div>
                  </>
                )}

                {f.type === 'dropdown' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ margin: 0 }}>Options (comma separated):</label>
                    <input style={{ padding: '0.25rem' }} value={(f.options || []).join(',')} onChange={e => updateField(i, 'options', e.target.value.split(','))} />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <button className="secondary" type="button" onClick={() => addField('text')}>+ Text</button>
            <button className="secondary" type="button" onClick={() => addField('rating')}>+ Rating</button>
            <button className="secondary" type="button" onClick={() => addField('dropdown')}>+ Dropdown</button>
            <button className="secondary" type="button" onClick={() => addField('checkbox')}>+ Checkbox</button>
          </div>

        </div>

        <div style={{ marginTop: '2rem' }}>
          <button onClick={handleSave} disabled={saving} style={{ width: '100%', fontSize: '1.125rem' }}>
            {saving ? 'Saving...' : <><Save size={18} style={{ marginRight: '0.5rem' }} /> Save Form & Get Code</>}
          </button>
        </div>
      </div>

      <div>
        <Preview />
      </div>
    </div>
  );
}
