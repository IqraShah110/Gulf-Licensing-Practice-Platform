const API_BASE = '';

export async function fetchMCQsBySubject(subject) {
  const response = await fetch(`${API_BASE}/get_mcqs/${subject}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch MCQs');
  }
  return response.json();
}

export async function fetchMCQsByExam(year, month) {
  const response = await fetch(`${API_BASE}/get_mcqs/exam/${year}/${month}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch MCQs');
  }
  return response.json();
}

export async function fetchMockTestMCQs() {
  const response = await fetch(`${API_BASE}/get_mcqs/mock_test`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch mock test MCQs');
  }
  return response.json();
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatExplanation(explanation) {
  if (!explanation || explanation.trim() === '' || explanation === null || explanation === undefined) {
    return '<div style="padding: 20px; text-align: center; color: #666;"><p>No explanation is available for this question.</p></div>';
  }

  try {
    const sections = explanation.split(/\*\*[\d.]+\s+/);
    const result = sections
      .map((section) => {
        if (!section.trim()) return '';

        const [title, ...content] = section.split('**');
        if (!title || !content.length) return '';

        return formatExplanationSection(title, content.join(''));
      })
      .join('');
    
    if (!result || result.trim() === '') {
      return `<div style="padding: 20px; overflow-wrap: break-word; line-height: 1.6;">${explanation}</div>`;
    }
    
    return result;
  } catch (error) {
    console.error('Error formatting explanation:', error);
    return `<div style="padding: 20px; overflow-wrap: break-word; line-height: 1.6;">${explanation}</div>`;
  }
}

function formatExplanationSection(title, content) {
  return `
    <div class="explanation-section">
      <h3 class="section-header">${title.trim()}</h3>
      <div class="explanation-content">
        ${formatExplanationContent(content.trim())}
      </div>
    </div>
  `;
}

function formatExplanationContent(content) {
  return content
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('*')) {
        return `<li>${line.trim().substring(1).trim()}</li>`;
      }
      return `<p>${line}</p>`;
    })
    .join('\n')
    .replace(/<li>.*?<\/li>(\n<li>.*?<\/li>)*/g, (match) => `<ul>${match}</ul>`)
    .replace(/Key Point:/g, '<div class="key-point"><strong>Key Point:</strong>')
    .replace(/Warning:/g, '<div class="warning-point"><strong>Warning:</strong>')
    .replace(/\n(?=\n|$)/g, '</div>\n')
    .replace(/\n/g, '<br>');
}

