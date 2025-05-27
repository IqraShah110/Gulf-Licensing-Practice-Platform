import os
from dotenv import load_dotenv
from extract_mcqs import extract_mcqs_from_pdf
from classify_mcqs import classify_mcqs
from db_handler import initialize_database, batch_insert_mcqs, get_mcq_statistics
import time

# Load environment variables
load_dotenv()

def process_pdf_in_chunks(pdf_path, chunk_size=20):
    """Process a PDF file in chunks to avoid rate limits"""
    print(f"\n📚 Processing PDF: {pdf_path}")
    print("=" * 50)
    
    total_successful = 0
    total_failed = 0
    current_page = 0
    
    while True:
        try:
            print(f"\n🔄 Processing pages {current_page + 1} to {current_page + chunk_size}...")
            
            # Extract MCQs from current chunk
            mcqs, _ = extract_mcqs_from_pdf(pdf_path, max_pages=chunk_size, start_page=current_page)
            
            if not mcqs:
                print("No more MCQs found in this chunk.")
                break
                
            print(f"📝 Extracted {len(mcqs)} MCQs")
            
            # Classify MCQs
            print("\n🏷️ Classifying MCQs...")
            classified_mcqs = classify_mcqs(mcqs)
            print(f"✅ Classified {len(classified_mcqs)} MCQs")
            
            # Save to database
            print("\n💾 Saving to database...")
            source_file = f"{os.path.basename(pdf_path)}:p{current_page+1}-{current_page+chunk_size}"
            successful, failed = batch_insert_mcqs(classified_mcqs, source_file)
            
            total_successful += successful
            total_failed += failed
            
            # Move to next chunk
            current_page += chunk_size
            
            # Add a small delay to avoid rate limits
            time.sleep(2)
            
        except Exception as e:
            print(f"\n❌ Error processing chunk: {str(e)}")
            print("Moving to next chunk...")
            current_page += chunk_size
            continue
    
    return total_successful, total_failed

def main():
    # Initialize database
    print("🔧 Initializing database...")
    initialize_database()
    
    # Process PDF files in the pdf_files directory
    pdf_dir = "pdf_files"
    total_successful = 0
    total_failed = 0
    
    if not os.path.exists(pdf_dir):
        print(f"\n❌ Directory {pdf_dir} not found!")
        return
    
    pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
    
    if not pdf_files:
        print(f"\n❌ No PDF files found in {pdf_dir}!")
        return
    
    print(f"\n📁 Found {len(pdf_files)} PDF files to process")
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join(pdf_dir, pdf_file)
        print(f"\n📄 Processing file: {pdf_file}")
        print("-" * 50)
        
        successful, failed = process_pdf_in_chunks(pdf_path)
        total_successful += successful
        total_failed += failed
        
        print(f"\n✅ Completed processing {pdf_file}")
        print(f"Successfully saved: {successful} MCQs")
        print(f"Failed to save: {failed} MCQs")
    
    # Show final statistics
    print("\n📊 Final Results:")
    print("=" * 50)
    print(f"Total MCQs successfully saved: {total_successful}")
    print(f"Total MCQs failed to save: {total_failed}")
    print("\n📈 Current database statistics:")
    get_mcq_statistics()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Process interrupted by user")
        print("\n📊 Current database statistics:")
        get_mcq_statistics()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\n📊 Final database statistics:")
        get_mcq_statistics()