from db_handler import initialize_database, batch_insert_mcqs, get_mcq_statistics
import json
import os
from extract_mcqs import extract_mcqs_from_pdf, format_mcqs_for_display
from classify_mcqs import classify_mcqs
import time

def process_and_save_mcqs(pdf_path, max_pages=None):
    """Process a PDF file and save extracted & classified MCQs to database"""
    
    # Extract MCQs from PDF
    print(f"\nProcessing PDF: {pdf_path}")
    print("-" * 50)
    
    mcqs, _ = extract_mcqs_from_pdf(pdf_path, max_pages)
    print(f"Extracted {len(mcqs)} MCQs from PDF")
    
    # Process MCQs in smaller batches
    batch_size = 10
    total_mcqs = len(mcqs)
    
    for i in range(0, total_mcqs, batch_size):
        batch = mcqs[i:i + batch_size]
        print(f"\nProcessing batch {i//batch_size + 1} of {(total_mcqs + batch_size - 1)//batch_size}")
        
        # Save current batch to extracted_mcqs.json
        try:
            with open('extracted_mcqs.json', 'w', encoding='utf-8') as f:
                json.dump(batch, f, indent=2, ensure_ascii=False)
            print(f"Saved batch to extracted_mcqs.json")
        except Exception as e:
            print(f"Error saving extracted MCQs batch to JSON: {str(e)}")
        
        # Classify current batch
        print("Classifying batch...")
        classified_batch = classify_mcqs(batch)
        print(f"Classified {len(classified_batch)} MCQs")
        
        # Save classified batch to classified_mcqs.json
        try:
            with open('classified_mcqs.json', 'w', encoding='utf-8') as f:
                json.dump(classified_batch, f, indent=2, ensure_ascii=False)
            print(f"Saved classified batch to classified_mcqs.json")
        except Exception as e:
            print(f"Error saving classified MCQs batch to JSON: {str(e)}")
        
        # Save batch to database
        print("Saving batch to database...")
        source_file = os.path.basename(pdf_path)
        successful, failed = batch_insert_mcqs(classified_batch, source_file)
        
        print(f"Batch {i//batch_size + 1} results:")
        print(f"✅ Successfully saved: {successful}")
        print(f"❌ Failed to save: {failed}")
        
        # Add a small delay between batches
        time.sleep(2)
    
    return successful, failed

def save_classified_mcqs_from_json(json_file):
    """Save already classified MCQs from a JSON file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            classified_mcqs = json.load(f)
        
        print(f"\nLoaded {len(classified_mcqs)} classified MCQs from {json_file}")
        source_file = os.path.basename(json_file)
        successful, failed = batch_insert_mcqs(classified_mcqs, source_file)
        
        return successful, failed
    except Exception as e:
        print(f"❌ Error loading classified MCQs from {json_file}: {e}")
        return 0, 0

if __name__ == "__main__":
    # Extract MCQs from PDF with increased page limit
    print("Starting MCQ extraction...")
    mcqs, original_text = extract_mcqs_from_pdf('pdf_files/March 2025.pdf', max_pages=100)  # Increased from 20 to 100
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
