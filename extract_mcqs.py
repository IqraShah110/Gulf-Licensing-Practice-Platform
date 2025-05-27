import fitz  # PyMuPDF
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json
import time

# Load environment variables and configure Gemini
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
# Use Gemini 2.0 Flash model
model = genai.GenerativeModel("models/gemini-2.0-flash-001")
def create_extraction_prompt(text_content):
    return """Extract all Multiple Choice Questions (MCQs) from the given text and any accompanying images. Follow these rules strictly:

INPUT RULES:
- Process questions even if they are split across multiple pages (e.g., if a question starts at the bottom of one page and continues—partially or fully—on the next page).
- Include MCQs from images as well—analyze the text within any images and treat it with equal priority as text content.
- Only process numbered questions (e.g., "1-", "2.", "3)", etc.)
- Only process options marked as A), B), C), D) orKO A., B., C., D.

ANSWER EXTRACTION:
- If an answer is explicitly given using "R:" or "Answer:", extract that.
- If an answer is **highlighted (e.g., using bold, underline, color, or visual emphasis in the image)**, treat that as the correct answer even if "Answer:" or "R:" is not provided.

IGNORE:
- All URLs and references

OUTPUT FORMAT:
Return a list of JSON objects, each containing:
{
    "question_number": (question number),
    "question_text": (question text only),
    "options": {
        "A": (option A text),
        "B": (option B text),
        "C": (option C text),
        "D": (option D text)
    },
    "correct_answer": (just the letter A, B, C, or D)
}

TEXT TO PROCESS:
""" + text_content


def clean_json_content(content):
    """Clean and extract JSON content from the response"""
    try:
        # Remove any text before the first '[' or '{'
        start = content.find('[')
        if start == -1:
            start = content.find('{')
        if start == -1:
            return None
        
        # Remove any text after the last ']' or '}'
        end = content.rfind(']')
        if end == -1:
            end = content.rfind('}')
        if end == -1:
            return None
        
        # Extract the JSON part
        json_content = content[start:end + 1]
        return json_content.strip()
    except Exception as e:
        print(f"Error cleaning JSON content: {str(e)}")
        return None

def sort_mcqs_by_number(mcqs):
    """Sort MCQs by question number in ascending order"""
    def extract_number(question_number):
        # Remove any non-digit characters and convert to integer
        # If no digits found, return infinity (to put at the end)
        try:
            return int(''.join(filter(str.isdigit, question_number)))
        except:
            return float('inf')
    
    return sorted(mcqs, key=lambda x: extract_number(x['question_number']))

def clean_question_text(question_text, question_number):
    """Clean question text by removing the question number prefix"""
    # Remove common question number patterns
    patterns = [
        f"{question_number}-",  # e.g., "1-"
        f"{question_number}.",  # e.g., "1."
        f"{question_number})",  # e.g., "1)"
        f"{question_number} -",  # e.g., "1 -"
        f"{question_number} .",  # e.g., "1 ."
        f"{question_number} )",  # e.g., "1 )"
    ]
    
    cleaned_text = question_text
    for pattern in patterns:
        if cleaned_text.startswith(pattern):
            cleaned_text = cleaned_text[len(pattern):].strip()
    
    return cleaned_text

def generate_explanation(mcq):
    """Generate a brief and focused explanation for the MCQ using Gemini"""
    try:
        prompt = f"""Write a medical explanation in EXACTLY two paragraphs. Use a blank line between paragraphs.

Question: {mcq['question_text']}

Options:
{"".join(f"{k}) {v}\n" for k, v in mcq['options'].items())}
Correct Answer: {mcq['correct_answer']}

FIRST PARAGRAPH (Definition):
- Define or explain the correct option
- Keep it to 3-4 sentences
- Do not mention the question or other options

SECOND PARAGRAPH (Application):
- Explain how it relates to the question
- Keep it to 2-3 sentences
- Focus on why this is the correct answer

IMPORTANT: Use a blank line between paragraphs. Do not repeat the question or use phrases like "Here's the explanation" or "The correct answer is"."""

        response = model.generate_content(prompt).text.strip()
        
        # Format the correct option as bold heading
        correct_opt = mcq['correct_answer']
        correct_text = mcq['options'][correct_opt]
        
        # Split into paragraphs and clean up
        paragraphs = [p.strip() for p in response.split('\n\n') if p.strip()]
        
        if len(paragraphs) >= 2:
            # Format with bold heading and two paragraphs with HTML breaks
            formatted_response = f"<b>{correct_opt}) {correct_text}</b><br><br>"
            formatted_response += paragraphs[0] + "<br><br>"
            formatted_response += paragraphs[1]
        else:
            # If response isn't properly split, try to split by period
            sentences = [s.strip() for s in response.split('.') if s.strip()]
            if len(sentences) >= 2:
                # Find a good breaking point (usually after 1-2 sentences)
                break_point = min(2, len(sentences) // 2)
                first_para = '. '.join(sentences[:break_point]) + '.'
                second_para = '. '.join(sentences[break_point:])
                formatted_response = f"<b>{correct_opt}) {correct_text}</b><br><br>"
                formatted_response += first_para + "<br><br>"
                formatted_response += second_para
            else:
                # If all else fails, try to split by semicolon or comma
                parts = [p.strip() for p in response.replace(';', '.').replace(',', '.').split('.') if p.strip()]
                if len(parts) >= 2:
                    break_point = min(2, len(parts) // 2)
                    first_para = '. '.join(parts[:break_point]) + '.'
                    second_para = '. '.join(parts[break_point:])
                    formatted_response = f"<b>{correct_opt}) {correct_text}</b><br><br>"
                    formatted_response += first_para + "<br><br>"
                    formatted_response += second_para
                else:
                    # Last resort: split the text in half
                    words = response.split()
                    mid_point = len(words) // 2
                    first_para = ' '.join(words[:mid_point]) + '.'
                    second_para = ' '.join(words[mid_point:])
                    formatted_response = f"<b>{correct_opt}) {correct_text}</b><br><br>"
                    formatted_response += first_para + "<br><br>"
                    formatted_response += second_para
            
        return formatted_response
    except Exception as e:
        print(f"Error generating explanation: {str(e)}")
        return None

def extract_mcqs_from_pdf(pdf_path, max_pages=None, start_page=0):
    """Extract MCQs from PDF with optional page limit and start page"""
    doc = fitz.open(pdf_path)
    all_mcqs = []
    original_text = ""
    
    # Calculate page range
    end_page = min((start_page + max_pages) if max_pages else len(doc), len(doc))
    total_pages = end_page - start_page
    print(f"Processing pages {start_page + 1} to {end_page} from PDF...")
    
    # First, get text from all pages with formatting
    for page_num in range(start_page, end_page):
        page = doc[page_num]
        # Get both text and text with formatting information
        text = page.get_text()
        text_with_format = page.get_text("dict")
        
        # Process text formatting to detect highlights and emphasis
        formatted_text = ""
        for block in text_with_format["blocks"]:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        # Check for highlighting, bold, or other emphasis
                        is_highlighted = span.get("flags", 0) & 2**7
                        is_bold = span.get("flags", 0) & 2**2
                        is_italic = span.get("flags", 0) & 2**1
                        text_fragment = span["text"]
                        
                        if is_highlighted or is_bold or is_italic:
                            formatted_text += f"<<EMPHASIS>>{text_fragment}<<END_EMPHASIS>>"
                        else:
                            formatted_text += text_fragment
                    formatted_text += "\n"
        
        original_text += formatted_text
    
    # Process the PDF in larger chunks with overlap
    chunk_size = 5  # Process 5 pages at a time
    overlap = 2  # Two pages overlap to better catch cross-page content
    
    for page_num in range(start_page, end_page, chunk_size - overlap):
        current_chunk = ""
        # Get text from current chunk of pages with overlap
        end_chunk = min(page_num + chunk_size, end_page)
        
        for p in range(page_num, end_chunk):
            page = doc[p]
            text = page.get_text()
            current_chunk += text
        
        if current_chunk:
            max_retries = 3
            retry_count = 0
            
            while retry_count < max_retries:
                try:
                    # Clean up the chunk text
                    clean_chunk = current_chunk.replace('\n\n', '\n').strip()
                    
                    # Generate response from Gemini
                    print(f"\nProcessing chunk {(page_num - start_page)//(chunk_size - overlap) + 1}...")
                    response = model.generate_content("""Extract all Multiple Choice Questions (MCQs) from the given text. Follow these rules strictly:

1. Process ALL numbered questions (1-100).
2. Include complete question text and all options.
3. Look for answers marked by:
   - "R:" or "Answer:" followed by letter
   - Highlighted/bold/emphasized text
   - Asterisk (*) or check mark (✓)
   - Any visual emphasis indicating correct answer

4. For each MCQ, output a JSON object:
{
    "question_number": "exact number as shown",
    "question_text": "complete question",
    "options": {
        "A": "full text",
        "B": "full text",
        "C": "full text",
        "D": "full text"
    },
    "correct_answer": "A/B/C/D or null if unclear"
}

TEXT TO PROCESS:
""" + clean_chunk)
                    
                    # Extract JSON from response
                    try:
                        json_content = clean_json_content(response.text)
                        if json_content:
                            mcqs = json.loads(json_content)
                            if isinstance(mcqs, list):
                                # Post-process MCQs to handle highlighted answers
                                for mcq in mcqs:
                                    if not mcq.get('correct_answer'):
                                        # Look for highlighted options
                                        for opt, text in mcq['options'].items():
                                            if text and (
                                                f"<<EMPHASIS>>{text}<<END_EMPHASIS>>" in original_text or
                                                f"*{text}" in original_text or
                                                f"✓{text}" in original_text or
                                                f"{text}*" in original_text or
                                                f"{text}✓" in original_text
                                            ):
                                                mcq['correct_answer'] = opt
                                                break
                                
                                all_mcqs.extend(mcqs)
                                print(f"Found {len(mcqs)} MCQs in chunk {(page_num - start_page)//(chunk_size - overlap) + 1}")
                            else:
                                all_mcqs.append(mcqs)
                                print(f"Found 1 MCQ in chunk {(page_num - start_page)//(chunk_size - overlap) + 1}")
                        else:
                            print(f"No valid JSON found in chunk {(page_num - start_page)//(chunk_size - overlap) + 1}")
                    except json.JSONDecodeError as e:
                        print(f"Error parsing JSON from chunk {(page_num - start_page)//(chunk_size - overlap) + 1}:")
                        print(f"Error: {str(e)}")
                    except Exception as e:
                        print(f"Error processing chunk {(page_num - start_page)//(chunk_size - overlap) + 1}: {str(e)}")
                    
                    break
                    
                except Exception as e:
                    retry_count += 1
                    if "429" in str(e):  # Rate limit error
                        wait_time = min(2 ** retry_count, 60)
                        print(f"\nRate limit hit, waiting {wait_time} seconds before retry...")
                        time.sleep(wait_time)
                    else:
                        print(f"Error with Gemini API: {str(e)}")
                        if retry_count < max_retries:
                            print(f"Retrying... (attempt {retry_count + 1}/{max_retries})")
                            time.sleep(2)
                        else:
                            print("Max retries reached, skipping chunk")
            
            time.sleep(2)  # Small delay between chunks
    
    # Post-process to remove duplicates and merge split questions
    processed_mcqs = {}
    
    for mcq in all_mcqs:
        q_num = mcq['question_number']
        # Clean the question text by removing the question number
        mcq['question_text'] = clean_question_text(mcq['question_text'], q_num)
        
        if q_num not in processed_mcqs:
            processed_mcqs[q_num] = mcq
        else:
            # If we have a duplicate, merge any missing information
            existing = processed_mcqs[q_num]
            if not existing['correct_answer'] and mcq['correct_answer']:
                existing['correct_answer'] = mcq['correct_answer']
            for opt, text in mcq['options'].items():
                if opt not in existing['options'] or not existing['options'][opt]:
                    existing['options'][opt] = text
            if len(mcq['question_text']) > len(existing['question_text']):
                existing['question_text'] = mcq['question_text']
    
    final_mcqs = list(processed_mcqs.values())
    
    # Generate explanations for MCQs with correct answers
    print("\nGenerating explanations for MCQs...")
    for mcq in final_mcqs:
        if mcq['correct_answer']:
            print(f"Generating explanation for question {mcq['question_number']}...")
            mcq['explanation'] = generate_explanation(mcq)
            # Add a small delay to avoid rate limiting
            time.sleep(2)
    
    # Sort MCQs by question number before returning
    final_mcqs = sort_mcqs_by_number(final_mcqs)
    
    doc.close()
    return final_mcqs, original_text

def format_mcqs_for_display(mcqs):
    """Format MCQs for display and create answer key"""
    formatted_mcqs = []
    answer_key = []
    
    for mcq in mcqs:
        try:
            # Format question
            formatted_q = {
                "question": f"{mcq['question_number']} {mcq['question_text']}",
                "options": [
                    f"{key}) {value}" for key, value in mcq['options'].items()
                ]
            }
            formatted_mcqs.append(formatted_q)
            
            # Format answer key
            answer = f"{mcq['question_number']}: {mcq['correct_answer']}"
            answer_key.append(answer)
        except KeyError as e:
            print(f"Error formatting MCQ: Missing key {e}")
        except Exception as e:
            print(f"Error formatting MCQ: {str(e)}")
    
    return formatted_mcqs, answer_key

def verify_extraction(original_text, mcqs):
    """Verify extracted MCQs against original text"""
    print("\nVerification Report:")
    print("-" * 50)
    
    for mcq in mcqs:
        question_num = mcq['question_number']
        correct_answer = mcq['correct_answer']
        
        # Look for answer markers in original text
        answer_marker = f"{question_num}. R: {correct_answer}"
        alt_answer_marker = f"{question_num}. Answer: {correct_answer}"
        
        if answer_marker in original_text or alt_answer_marker in original_text:
            print(f"✓ Question {question_num}: Answer verified ({correct_answer})")
        else:
            print(f"⚠ Question {question_num}: Answer may be incorrect (extracted: {correct_answer})")
            # Print nearby text for manual verification
            start_idx = original_text.find(f"{question_num}.")
            if start_idx != -1:
                context = original_text[start_idx:start_idx + 200]
                print(f"   Context: {context.replace('\n', ' ')}")

if __name__ == "__main__":
    # Extract MCQs from first 3 pages only
    print("Starting MCQ extraction...")
    mcqs, original_text = extract_mcqs_from_pdf('pdf_files/March 2025.pdf', max_pages=20)
    print(f"\nRaw MCQs extracted: {len(mcqs)}")
    
    # Format MCQs for display
    formatted_mcqs, answer_key = format_mcqs_for_display(mcqs)
    print(f"\nSuccessfully formatted {len(formatted_mcqs)} MCQs")
    print(f"Extracted {len(answer_key)} Answers")
    
    # Print answer key
    print("\nAnswer Key:")
    print("-" * 50)
    for answer in answer_key:
        print(answer)
    
    # Save extracted MCQs for classification
    with open('extracted_mcqs.json', 'w', encoding='utf-8') as f:
        json.dump(mcqs, f, indent=2, ensure_ascii=False)
    print("\nSaved extracted MCQs to extracted_mcqs.json")
