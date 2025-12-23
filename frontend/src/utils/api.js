const API_BASE = process.env.REACT_APP_API_BASE || '';

export async function fetchMCQsBySubject(subject) {
  const response = await fetch(`${API_BASE}/get_mcqs/${subject}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch MCQs');
  }
  return response.json();
}

export async function fetchMCQsByExam(year, month, options = {}) {
  // Ensure month is lowercase to match backend expectation
  const monthLower = month.toLowerCase();
  const url = `${API_BASE}/get_mcqs/exam/${year}/${monthLower}`;
  
  const response = await fetch(url, { signal: options.signal });
  
  if (!response.ok) {
    let errorMessage = 'Failed to fetch MCQs';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  return data;
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

  // Remove A, B, C, D labels from explanation text (comprehensive and aggressive)
  let cleanedExplanation = explanation
    // First, remove from the very beginning of the entire text
    .replace(/^[A-D]\)\s*/i, '')
    .replace(/^[A-D]\.\s*/i, '')
    .replace(/^[A-D]\s+/i, '')
    // Remove from start of lines (multiline)
    .replace(/^[A-D]\)\s*/gm, '') 
    .replace(/^[A-D]\.\s*/gm, '')
    .replace(/^[A-D]\s+/gm, '')
    // Remove after ** markers (titles) - handle with and without spaces
    .replace(/\*\*[A-D]\)\s*/gi, '**')
    .replace(/\*\*\s*[A-D]\)\s*/gi, '**')
    .replace(/\*\*[A-D]\.\s*/gi, '**')
    .replace(/\*\*\s*[A-D]\.\s*/gi, '**')
    .replace(/\*\*[A-D]\s+/gi, '**')
    .replace(/\*\*\s*[A-D]\s+/gi, '**')
    // Remove standalone in text (with spaces before and after)
    .replace(/\s+[A-D]\)\s+/gi, ' ')
    .replace(/\s+[A-D]\.\s+/gi, ' ')
    .replace(/\s+[A-D]\s+/gi, ' ')
    // Remove from HTML tags if any
    .replace(/<h[1-6][^>]*>([A-D]\)\s*)/gi, '<h$1>')
    .replace(/<h[1-6][^>]*>([A-D]\.\s*)/gi, '<h$1>')
    .replace(/<strong>([A-D]\)\s*)/gi, '<strong>')
    .replace(/<strong>([A-D]\.\s*)/gi, '<strong>')
    // Remove from paragraph tags
    .replace(/<p>([A-D]\)\s*)/gi, '<p>')
    .replace(/<p>([A-D]\.\s*)/gi, '<p>')
    // Remove from div tags
    .replace(/<div[^>]*>([A-D]\)\s*)/gi, '<div$1>')
    .replace(/<div[^>]*>([A-D]\.\s*)/gi, '<div$1>');

  try {
    const sections = cleanedExplanation.split(/\*\*[\d.]+\s+/);
    const result = sections
      .map((section) => {
        if (!section.trim()) return '';

        const [title, ...content] = section.split('**');
        if (!title || !content.length) return '';

        return formatExplanationSection(title, content.join(''));
      })
      .join('');
    
    if (!result || result.trim() === '') {
      return `<div style="padding: 20px; overflow-wrap: break-word; line-height: 1.6;">${cleanedExplanation}</div>`;
    }
    
    return result;
  } catch (error) {
    return `<div style="padding: 20px; overflow-wrap: break-word; line-height: 1.6;">${cleanedExplanation}</div>`;
  }
}

function formatExplanationSection(title, content) {
  // Remove A, B, C, D labels from title (comprehensive and aggressive)
  let cleanedTitle = title.trim()
    // Remove from start - multiple passes to catch all variations
    .replace(/^[A-D]\)\s*/i, '') // Remove "A) ", "B) ", "C) ", "D) " at start
    .replace(/^[A-D]\.\s*/i, '') // Remove "A. ", "B. ", "C. ", "D. " at start
    .replace(/^[A-D]\s+/i, '') // Remove "A ", "B ", "C ", "D " at start
    .replace(/^\([A-D]\)\s*/i, '') // Remove "(A) ", "(B) ", etc. at start
    .replace(/^\[[A-D]\]\s*/i, '') // Remove "[A] ", "[B] ", etc. at start
    // Remove from end
    .replace(/\s+[A-D]\)\s*$/i, '') // Remove " A)", " B)", etc. at end
    .replace(/\s+[A-D]\.\s*$/i, '') // Remove " A.", " B.", etc. at end
    .replace(/\s+[A-D]\s+$/i, '') // Remove " A ", " B ", etc. at end
    // Additional cleanup - remove any remaining labels
    .replace(/\b[A-D]\)\s*/gi, '') // Remove "A) " anywhere in title
    .replace(/\b[A-D]\.\s*/gi, ''); // Remove "A. " anywhere in title
  
  return `
    <div class="explanation-section">
      <h3 class="section-header">${cleanedTitle}</h3>
      <div class="explanation-content">
        ${formatExplanationContent(content.trim())}
      </div>
    </div>
  `;
}

function formatExplanationContent(content) {
  // First remove A, B, C, D labels from content
  let cleanedContent = content
    .replace(/^[A-D]\)\s*/gmi, '') // Remove from start of lines
    .replace(/^[A-D]\.\s*/gmi, '')
    .replace(/^[A-D]\s+/gmi, '')
    .replace(/\s+[A-D]\)\s+/gi, ' ') // Remove standalone
    .replace(/\s+[A-D]\.\s+/gi, ' ')
    .replace(/\s+[A-D]\s+/gi, ' ');
  
  return cleanedContent
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

