import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link2, Save, ArrowLeft } from 'lucide-react';

export default function FormBuilder({ apiBase, token }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('My Feedback Form');
  const [themeColor, setThemeColor] = useState('#4F46E5');
  const [position, setPosition] = useState('floating-right');
  const [fontFamily, setFontFamily] = useState('Outfit');
  const [fontSize, setFontSize] = useState('medium');
  const [submitLabel, setSubmitLabel] = useState('Submit');

  const [fields, setFields] = useState([
    { type: 'rating', label: 'How would you rate your experience?', is_required: true },
    { type: 'text', label: 'Any additional comments?', is_required: false, max_length: 500 }
  ]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetch(`${apiBase}/api/forms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.form) {
          setTitle(data.form.title);
          setThemeColor(data.form.theme_color);
          setPosition(data.form.widget_position);
          setFontFamily(data.form.font_family);
          setFontSize(data.form.font_size);
          setSubmitLabel(data.form.submit_label);
          setFields(data.fields.map(f => ({
            ...f,
            is_required: f.is_required === 1,
            options: f.options ? JSON.parse(f.options) : undefined
          })));
        }
      })
      .catch(err => console.error("Error loading form:", err))
      .finally(() => setLoading(false));
    }
  }, [id, isEditing, apiBase, token]);

  // A very basic preview UI, not full isolation, just visually similar
  const Preview = () => {
    return (
      <div className="panel" style={{ position: 'sticky', top: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Live Preview</h3>
        <div style={{ border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', background: 'var(--bg-color)' }}>
          <div style={{ background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '0.75rem', borderStyles: 'solid', borderWidth: '1px', borderColor: 'var(--border)', fontFamily: fontFamily }}>
            <h4 style={{ marginTop: 0, color: themeColor, fontSize: fontSize === 'large' ? '1.5rem' : fontSize === 'small' ? '1rem' : '1.25rem' }}>{title}</h4>
            <div style={{fontSize: fontSize === 'large' ? '1rem' : fontSize === 'small' ? '0.75rem' : '0.875rem' }}>
              {fields.map((f, i) => (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    {f.label} {f.is_required && <span style={{ color: 'red' }}>*</span>}
                  </label>
                  {f.type === 'text' && <input type="text" disabled placeholder="Text input" style={{ width: '100%', padding: '0.5rem' }} />}
                  {f.type === 'dropdown' && <select disabled style={{ width: '100%', padding: '0.5rem' }}><option>Dropdown...</option></select>}
                  {(f.type === 'rating' || f.type === 'nps') && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(f.type === 'nps' ? Array.from({ length: 11 }, (_, idx) => idx) : [1, 2, 3, 4, 5]).map(x => (
                        <div key={x} style={{ width: '40px', height: '40px', border: '1px solid var(--border)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{x}</div>
                      ))}
                    </div>
                  )}
                  {f.type === 'checkbox' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Array.isArray(f.options) && f.options.length > 0 ? (
                        f.options.map((opt, idx) => (
                          <label key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span>{opt}</span>
                            <input type="checkbox" disabled />
                          </label>
                        ))
                      ) : (
                        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span>{f.label}</span>
                          <input type="checkbox" disabled />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button style={{ width: '100%', background: themeColor, fontSize: fontSize === 'large' ? '1.1rem' : '0.9rem' }}>{submitLabel}</button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Widget Mode: <strong>{position}</strong>
          </div>
        </div>
      </div>
    );
  };

  const addField = (type) => {
    const defaultField = {
      type,
      label: type === 'checkbox' ? 'New Checkbox Group' : type === 'dropdown' ? 'New Dropdown' : 'New Field',
      is_required: false,
      options: type === 'checkbox' || type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined
    };
    setFields([...fields, defaultField]);
  };

  const updateField = (index, key, val) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: val } : f));
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formattedFields = fields.map(f => {
        const cleanField = {
          type: f.type,
          label: f.label,
          is_required: Boolean(f.is_required),
          options: (f.type === 'dropdown' || f.type === 'checkbox') && Array.isArray(f.options) 
            ? f.options.map(s => String(s).trim()).filter(Boolean) 
            : null,
          min_length: f.min_length || null,
          max_length: f.max_length || null
        };
        return cleanField;
      });
      const url = isEditing ? `${apiBase}/api/forms/${id}` : `${apiBase}/api/forms`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          theme_color: themeColor,
          widget_position: position,
          font_family: fontFamily,
          font_size: fontSize,
          submit_label: submitLabel,
          fields: formattedFields
        })
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/form/${isEditing ? id : data.formId}`);
      } else {
        const errorMsg = Array.isArray(data.error) 
          ? data.error.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
          : (data.error || 'Unknown error');
        alert("Validation Failed:\n" + errorMsg);
      }
    } catch (e) {
      console.error("CRITICAL SAVE ERROR:", e);
      alert(`Save Failed: ${e.message}\nCheck the browser console (F12) for details.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex-center" style={{height: '300px'}}><span className="loader" style={{borderColor: 'var(--accent)', borderTopColor: 'transparent'}}></span></div>;

  return (
    <div className="form-builder">
      <div style={{ gridColumn: '1 / -1', marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <button className="secondary" onClick={() => window.location.href = '/'} style={{ padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Dashboard
        </button>
      </div>
      <div>
        <div className="panel" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0 }}>{isEditing ? 'Edit Form' : 'General Settings'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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
              <label>Font Type</label>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                <option value="Outfit">Outfit</option>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="system-ui">System Default</option>
              </select>
            </div>
            <div className="form-group">
              <label>Font Size</label>
              <select value={fontSize} onChange={e => setFontSize(e.target.value)}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div className="form-group">
              <label>Submit Button Label</label>
              <input value={submitLabel} onChange={e => setSubmitLabel(e.target.value)} />
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

                {(f.type === 'dropdown' || f.type === 'checkbox') && (
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
            <button className="secondary" type="button" onClick={() => addField('nps')}>+ NPS</button>
            <button className="secondary" type="button" onClick={() => addField('dropdown')}>+ Dropdown</button>
            <button className="secondary" type="button" onClick={() => addField('checkbox')}>+ Checkbox</button>
          </div>

        </div>

        <div style={{ marginTop: '2rem' }}>
          <button onClick={handleSave} disabled={saving} style={{ width: '100%', fontSize: '1.125rem' }}>
            {saving ? 'Saving...' : <><Save size={18} style={{ marginRight: '0.5rem' }} /> {isEditing ? 'Update Form' : 'Save Form & Get Code'}</>}
          </button>
        </div>
      </div>

      <div>
        <Preview />
      </div>
    </div>
  );
}
