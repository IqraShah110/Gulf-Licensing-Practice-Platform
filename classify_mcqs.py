import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

# Load environment variables and configure Gemini
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
# Use Gemini 2.0 Flash model for better medical classification
model = genai.GenerativeModel("models/gemini-2.0-flash-001")

def create_classification_prompt(mcq_batch):
    """Create a prompt for medical subject classification."""
    prompt = """Classify each medical MCQ into one of these subjects:
1. Surgery – General Surgery
2. Medicine – Internal Medicine
3. Gynae – Gynecology and Obstetrics
4. Paeds – Pediatrics

Rules for classification:
- Surgery: Questions about surgical procedures, trauma, wounds, post-operative care
- Medicine: Questions about adult medical conditions, cardiology, respiratory, gastroenterology
- Gynae: Questions about pregnancy, female reproductive system, obstetric conditions
- Paeds: Questions about children, infant care, pediatric conditions

For each question, respond with ONLY the subject name (Surgery/Medicine/Gynae/Paeds).

Questions to classify:

"""
    for mcq in mcq_batch:
        prompt += f"Question {mcq['question_number']}: {mcq['question_text']}\n"
        for key, value in mcq['options'].items():
            if value:  # Only add non-null options
                prompt += f"{key}) {value}\n"
        prompt += "\n"

    return prompt

def classify_mcq_batch(mcq_batch):
    """Classify a batch of medical MCQs and return list of subjects."""
    try:
        # Generate classification
        prompt = create_classification_prompt(mcq_batch)
        print(f"\nClassifying batch of {len(mcq_batch)} MCQs...")
        response = model.generate_content(prompt)
        
        # Parse the response
        subjects = []
        lines = response.text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if any(subject in line.upper() for subject in ['SURGERY', 'MEDICINE', 'GYNAE', 'PAEDS']):
                # Extract just the subject name
                if 'SURGERY' in line.upper():
                    subjects.append('Surgery')
                elif 'MEDICINE' in line.upper():
                    subjects.append('Medicine')
                elif 'GYNAE' in line.upper():
                    subjects.append('Gynae')
                elif 'PAEDS' in line.upper():
                    subjects.append('Paeds')
        
        # If we didn't get enough subjects, pad with 'Unknown'
        while len(subjects) < len(mcq_batch):
            subjects.append('Unknown')
        
        return subjects
    except Exception as e:
        print(f"Error classifying batch: {str(e)}")
        return ['Unknown'] * len(mcq_batch)

def classify_mcqs(mcqs, batch_size=3):
    """Classify all MCQs using batching."""
    classified_mcqs = []
    total_mcqs = len(mcqs)
    
    print(f"\nClassifying {total_mcqs} MCQs into medical subjects...")
    
    for i in range(0, total_mcqs, batch_size):
        batch = mcqs[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{(total_mcqs + batch_size - 1)//batch_size}")
        
        subjects = classify_mcq_batch(batch)
        
        for mcq, subject in zip(batch, subjects):
            classified_mcq = mcq.copy()  # Preserve all original MCQ data
            classified_mcq['subject'] = subject
            classified_mcqs.append(classified_mcq)
    
    return classified_mcqs

def save_classified_mcqs(classified_mcqs, output_file='classified_mcqs.json'):
    """Save classified MCQs to a JSON file."""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(classified_mcqs, f, indent=2, ensure_ascii=False)
        print(f"\nClassified MCQs saved to {output_file}")
        
        # Print summary
        subjects = {}
        for mcq in classified_mcqs:
            subject = mcq['subject']
            subjects[subject] = subjects.get(subject, 0) + 1
        
        print("\nClassification Summary:")
        print("-" * 30)
        for subject, count in subjects.items():
            print(f"{subject}: {count} questions")
            
    except Exception as e:
        print(f"Error saving classified MCQs: {str(e)}")

if __name__ == "__main__":
    try:
        # Load extracted MCQs from JSON file
        print("Loading extracted MCQs...")
        with open('extracted_mcqs.json', 'r', encoding='utf-8') as f:
            mcqs = json.load(f)
        
        print(f"Loaded {len(mcqs)} MCQs for classification")
        
        # Classify the MCQs
        classified_mcqs = classify_mcqs(mcqs, batch_size=3)
        
        # Save results
        save_classified_mcqs(classified_mcqs)
        
    except FileNotFoundError:
        print("Error: extracted_mcqs.json not found. Please run extract_mcqs.py first.")
    except Exception as e:
        print(f"Error running classification: {str(e)}")
        
        # Test with sample MCQ if main extraction fails
        sample_mcq = {
            'question_number': '1',
            'question_text': 'A 33-year-old woman presenting with heavy menstruation. During examination you notice enlarged uterus.',
            'options': {
                'A': 'Perform hysterectomy',
                'B': 'Start oral contraceptives',
                'C': 'Order pelvic ultrasound',
                'D': 'Refer to oncologist'
            },
            'correct_answer': 'C'
        }
        
        classified = classify_mcqs([sample_mcq])
        print("\nTest Classification Result:")
        print(f"Question: {sample_mcq['question_text']}")
        print(f"Classified as: {classified[0]['subject']}")
