// Styles for the embedded widget
const styles = `
  :host {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --primary: #4F46E5;
    --bg: #ffffff;
    --text: #111827;
    --border: #e5e7eb;
    --ring: rgba(79, 70, 229, 0.5);
  }

  .form-container {
    background: var(--bg);
    color: var(--text);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
    max-width: 400px;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border);
  }

  .floating-right {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
  }

  .floating-left {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 999999;
  }


  .inline {
    margin: 20px 0;
  }

  h2 {
    margin-top: 0;
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--primary);
  }

  .field-group {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
  }

  label {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .required {
    color: #ef4444;
  }

  input[type="text"], select, textarea {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    outline: none;
    transition: box-shadow 0.2s, border-color 0.2s;
  }

  input[type="text"]:focus, select:focus, textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--ring);
  }

  .rating-group {
    display: flex;
    gap: 0.5rem;
  }

  .rating-btn {
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid var(--border);
    background: transparent;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .rating-btn:hover, .rating-btn.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .checkbox-group input {
    margin: 0;
  }

  .checkbox-group label {
    margin: 0;
  }

  button[type="submit"] {
    width: 100%;
    padding: 0.625rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  button[type="submit"]:hover {
    filter: brightness(0.9);
  }

  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loader-text, .success-msg, .error-msg {
    font-size: 0.875rem;
    text-align: center;
    margin-top: 0.5rem;
  }

  .success-msg { color: #10b981; font-weight: 600; }
  .error-msg { color: #ef4444; }

  /* Dark mode auto-switch based on host */
  @media (prefers-color-scheme: dark) {
    :host {
      --bg: #1f2937;
      --text: #f9fafb;
      --border: #374151;
    }
    input[type="text"], select, textarea {
      background: #111827;
      color: white;
    }
  }
`;

class FormifyWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = null;
  }

  async connectedCallback() {
    this.formId = this.getAttribute('form-id');
    this.apiBase = this.getAttribute('api-base') || 'http://localhost:5000';
    this.shadowRoot.innerHTML = '<div style="padding:1rem;font-family:sans-serif;">Loading widget...</div>';
    await this.fetchConfig();
    this.render();
  }

  async fetchConfig() {
    try {
      const res = await fetch(`${this.apiBase}/api/widget/${this.formId}/config`);
      if (!res.ok) throw new Error('Form not found');
      this.config = await res.json();
    } catch (e) {
      this.shadowRoot.innerHTML = '<div style="color:red;padding:1rem;">Failed to load form widget.</div>';
    }
  }

  render() {
    if (!this.config) return;

    const { form, fields } = this.config;

    // Set theme base color
    let styleText = styles.replace(/--primary:.*;/g, "--primary: " + form.theme_color + ";");

    // Convert RGB to ring color roughly
    styleText = styleText.replace(/--ring:.*;/g, "--ring: " + form.theme_color + "80;");

    const styleEl = document.createElement('style');
    styleEl.textContent = styleText;

    const wrapper = document.createElement('div');
    const posClass = form.widget_position === 'floating' ? 'floating-right' : form.widget_position;
    wrapper.className = "form-container " + posClass;

    const title = document.createElement('h2');
    title.textContent = form.title;
    wrapper.appendChild(title);

    const formEl = document.createElement('form');
    formEl.addEventListener('submit', this.handleSubmit.bind(this));

    fields.forEach(field => {
      const fg = document.createElement('div');
      fg.className = "field-group " + (field.type === 'checkbox' ? 'checkbox-group' : '');

      const label = document.createElement('label');
      label.innerHTML = field.label + (field.is_required ? '<span class="required">*</span>' : '');

      // Swap order for checkbox
      if (field.type !== 'checkbox') fg.appendChild(label);

      let input;
      if (field.type === 'text') {
        input = document.createElement(field.max_length > 100 ? 'textarea' : 'input');
        if (input.tagName === 'INPUT') input.type = 'text';
        input.name = field.label;
        if (field.is_required) input.required = true;
        if (field.min_length) input.minLength = field.min_length;
        if (field.max_length) input.maxLength = field.max_length;
        fg.appendChild(input);
      } else if (field.type === 'dropdown') {
        input = document.createElement('select');
        input.name = field.label;
        if (field.is_required) input.required = true;
        input.innerHTML = '<option value="">Select an option...</option>' +
          field.options.map(opt => '<option value="' + opt + '">' + opt + '</option>').join('');
        fg.appendChild(input);
      } else if (field.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.name = field.label;
        if (field.is_required) input.required = true;
        fg.appendChild(input);
        fg.appendChild(label);
      } else if (field.type === 'rating' || field.type === 'nps') {
        const valInput = document.createElement('input');
        valInput.type = 'hidden';
        valInput.name = field.label;
        if (field.is_required) valInput.required = true;

        const max = field.type === 'rating' ? 5 : 10;
        const g = document.createElement('div');
        g.className = 'rating-group';
        let btns = [];

        for (let i = 1; i <= max; i++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'rating-btn';
          b.textContent = i;
          b.onclick = () => {
            valInput.value = i;
            btns.forEach(x => x.classList.remove('active'));
            b.classList.add('active');
          };
          g.appendChild(b);
          btns.push(b);
        }
        fg.appendChild(g);
        fg.appendChild(valInput);
      }

      formEl.appendChild(fg);
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Submit';
    formEl.appendChild(submitBtn);

    const msgBox = document.createElement('div');
    msgBox.className = 'msg-box';
    formEl.appendChild(msgBox);

    wrapper.appendChild(formEl);
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(styleEl);
    this.shadowRoot.appendChild(wrapper);
  }

  async handleSubmit(e) {
    e.preventDefault();
    const formEl = e.target;
    const formData = new FormData(formEl);
    const data = Object.fromEntries(formData.entries());

    // Checkbox special handle
    formEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      data[cb.name] = cb.checked;
    });

    const btn = formEl.querySelector('button[type="submit"]');
    const msgBox = formEl.querySelector('.msg-box');

    btn.disabled = true;
    btn.textContent = 'Submitting...';
    msgBox.innerHTML = '';

    try {
      const res = await fetch(this.apiBase + "/api/widget/" + this.formId + "/submit", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Submission failed');
      }

      msgBox.innerHTML = '<div class="success-msg">Thank you! Your feedback has been submitted.</div>';
      formEl.reset();
      formEl.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));

      // Keep button disabled to avoid spam duplicates visually
      btn.textContent = 'Submit';
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Submit';
      msgBox.innerHTML = '<div class="error-msg">' + err.message + '</div>';
    }
  }
}

customElements.define('formify-widget', FormifyWidget);

// Injection script logic
(function () {
  const scripts = document.getElementsByTagName('script');
  const currentScript = scripts[scripts.length - 1]; // or locate via ID if needed

  // Actually, searching document for a specific script tag is sometimes flawed. 
  // We can just query `script[data-form-id]`
  const scriptTag = document.querySelector('script[data-form-id]');
  if (scriptTag) {
    const formId = scriptTag.getAttribute('data-form-id');
    const apiBase = scriptTag.getAttribute('data-api-base') || 'http://localhost:5000';

    const w = document.createElement('formify-widget');
    w.setAttribute('form-id', formId);
    w.setAttribute('api-base', apiBase);

    // Insert adjacent to script
    scriptTag.parentNode.insertBefore(w, scriptTag.nextSibling);
  }
})();
