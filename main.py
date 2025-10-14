#!/usr/bin/env python3
"""
Clean MCQ Extractor for March 2025.pdf
Simple, focused extraction with start/end page support
"""

import os
import sys
from dotenv import load_dotenv
from extract_mcqs import extract_mcqs_from_pdf
from classify_mcqs import classify_mcqs
from db_handler import ensure_all_tables_exist, batch_insert_mcqs, get_mcq_statistics
import time

# Load environment variables
load_dotenv()

def extract_mcqs_from_pdf_range(pdf_path, start_page, end_page, chunk_size=10):
    """Extract MCQs from a specific page range in chunks"""
    print(f"\n📚 Processing PDF: {os.path.basename(pdf_path)}")
    print(f"📖 Pages: {start_page} to {end_page}")
    print(f"📦 Chunk size: {chunk_size} pages")
    print("=" * 50)
    
    total_successful = 0
    total_failed = 0
    current_page = start_page - 1  # Convert to 0-indexed
    
    while current_page < end_page:
        chunk_end = min(current_page + chunk_size, end_page)
        
        try:
            print(f"\n🔄 Processing pages {current_page + 1} to {chunk_end}...")
            
            # Extract MCQs from current chunk
            mcqs, _ = extract_mcqs_from_pdf(
                pdf_path, 
                max_pages=chunk_end - current_page, 
                start_page=current_page
            )
            
            if not mcqs:
                print("⚠️ No MCQs found in this chunk")
                current_page += chunk_size
                continue
                
            print(f"📝 Extracted {len(mcqs)} MCQs")
            
            # Classify MCQs
            print("🏷️ Classifying MCQs...")
            classified_mcqs = classify_mcqs(mcqs)
            print(f"✅ Classified {len(classified_mcqs)} MCQs")
            
            # Save to database
            source_file = f"{os.path.basename(pdf_path)}:p{current_page+1}-{chunk_end}"
            successful, failed = batch_insert_mcqs(classified_mcqs, source_file)
            
            total_successful += successful
            total_failed += failed
            
            print(f"💾 Saved: {successful} successful, {failed} failed")
            
            # Move to next chunk
            current_page += chunk_size
            
            # Rate limiting
            time.sleep(2)
            
        except Exception as e:
            print(f"❌ Error processing chunk: {e}")
            current_page += chunk_size
            continue
    
    return total_successful, total_failed

def validate_pdf_and_pages(pdf_path, start_page, end_page):
    """Validate PDF exists and page range is valid"""
    if not os.path.exists(pdf_path):
        print(f"❌ PDF not found: {pdf_path}")
        return False
    
    try:
        import fitz
        doc = fitz.open(pdf_path)
        total_pages = doc.page_count
        doc.close()
        
        if start_page > total_pages:
            print(f"❌ Start page {start_page} > total pages {total_pages}")
            return False
        
        if end_page > total_pages:
            print(f"⚠️ End page {end_page} > total pages {total_pages}, adjusting to {total_pages}")
            return total_pages
        
        if start_page >= end_page:
            print(f"❌ Start page {start_page} must be < end page {end_page}")
            return False
        
        return True
        
    except Exception as e:
        print(f"⚠️ Could not validate PDF: {e}")
        return True

def show_help():
    """Show usage help"""
    print("\n📖 MCQ Extractor Usage:")
    print("=" * 40)
    print("python main.py [pdf_name] [start_page] [end_page] [chunk_size]")
    print("\nExamples:")
    print("  python main.py                           # Default: March 2025.pdf, pages 1-50")
    print("  python main.py 'March 2025.pdf' 1 100    # Pages 1-100")
    print("  python main.py 'March 2025.pdf' 1 100 5  # Pages 1-100, 5-page chunks")
    print("\nAvailable PDFs:")
    pdf_dir = "pdf_files"
    if os.path.exists(pdf_dir):
        for file in os.listdir(pdf_dir):
            if file.endswith('.pdf'):
                print(f"  - {file}")

def parse_arguments():
    """Parse command line arguments"""
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help', 'help']:
        show_help()
        sys.exit(0)
    
    # Defaults
    pdf_name = "March 2025.pdf"
    start_page = 438
    end_page = 452
    chunk_size = 20
    
    # Parse arguments
    if len(sys.argv) > 1:
        pdf_name = sys.argv[1]
    if len(sys.argv) > 2:
        start_page = int(sys.argv[2])
    if len(sys.argv) > 3:
        end_page = int(sys.argv[3])
    if len(sys.argv) > 4:
        chunk_size = int(sys.argv[4])
    
    return pdf_name, start_page, end_page, chunk_size

def main():
    """Main extraction function"""
    print("🚀 MCQ Extractor for March 2025.pdf")
    print("=" * 40)
    
    # Parse arguments
    pdf_name, start_page, end_page, chunk_size = parse_arguments()
    
    # Setup paths
    pdf_dir = "pdf_files"
    pdf_path = os.path.join(pdf_dir, pdf_name)
    
    # Validate PDF and pages
    if not validate_pdf_and_pages(pdf_path, start_page, end_page):
        return
    
    # Initialize database
    print("🔧 Initializing database...")
    ensure_all_tables_exist()
    
    # Extract MCQs
    successful, failed = extract_mcqs_from_pdf_range(pdf_path, start_page, end_page, chunk_size)
    
    # Show results
    print(f"\n📊 Results:")
    print(f"✅ Successfully saved: {successful} MCQs")
    print(f"❌ Failed to save: {failed} MCQs")
    if successful + failed > 0:
        print(f"📈 Success rate: {(successful / (successful + failed) * 100):.1f}%")
    
    # Verify questions were stored in database
    if successful > 0:
        print(f"\n🔍 Verifying database storage...")
        verify_database_storage(pdf_path, start_page, end_page)
        
        print(f"\n🔍 Verifying explanations...")
        verify_explanations(pdf_path, start_page, end_page)
    
    # Show database statistics
    print(f"\n📈 Database statistics:")
    get_mcq_statistics()

def verify_database_storage(pdf_path, start_page, end_page):
    """Verify that MCQs are properly stored in database"""
    try:
        from db_handler import get_connection
        
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Get total count of MCQs
                cur.execute("SELECT COUNT(*) FROM march25_mcqs")
                total_mcqs = cur.fetchone()[0]
                
                # Get MCQs from the recent extraction
                cur.execute("""
                    SELECT id, question_number, question_text, correct_answer, subject, explanation
                    FROM march25_mcqs 
                    WHERE source_file LIKE %s
                    ORDER BY id DESC
                    LIMIT 20
                """, (f"%{os.path.basename(pdf_path)}%",))
                
                rows = cur.fetchall()
                
                print(f"\n📊 Database Storage Verification:")
                print(f"Total MCQs in database: {total_mcqs}")
                print(f"Recent MCQs from this extraction: {len(rows)}")
                
                if rows:
                    print(f"\n📋 Recent MCQs stored:")
                    questions_stored = 0
                    explanations_stored = 0
                    
                    for row in rows:
                        mcq_id, q_num, question, correct_answer, subject, explanation = row
                        questions_stored += 1
                        
                        # Check if question has proper data
                        question_status = "✅" if len(question.strip()) > 10 else "❌"
                        answer_status = "✅" if correct_answer in ['A', 'B', 'C', 'D'] else "❌"
                        subject_status = "✅" if subject else "❌"
                        explanation_status = "✅" if explanation and len(explanation.strip()) > 50 else "⚠️"
                        
                        if explanation and len(explanation.strip()) > 50:
                            explanations_stored += 1
                        
                        print(f"  {question_status} Q{q_num}: Question={question_status}, Answer={answer_status}, Subject={subject_status}, Explanation={explanation_status}")
                    
                    print(f"\n📈 Storage Summary:")
                    print(f"Questions properly stored: {questions_stored}/{len(rows)}")
                    print(f"Explanations present: {explanations_stored}/{len(rows)}")
                    print(f"Storage success rate: {(questions_stored/len(rows)*100):.1f}%")
                    
                    # Show sample question
                    if rows:
                        sample = rows[0]
                        print(f"\n📝 Sample stored question:")
                        print(f"  ID: {sample[0]}")
                        print(f"  Question: {sample[2][:100]}...")
                        print(f"  Answer: {sample[3]}")
                        print(f"  Subject: {sample[4]}")
                        print(f"  Explanation: {'Present' if sample[5] else 'Missing'}")
                else:
                    print("❌ No MCQs found in database from this extraction")
                    
    except Exception as e:
        print(f"❌ Could not verify database storage: {e}")

def verify_explanations(pdf_path, start_page, end_page):
    """Verify that explanations were properly generated and saved"""
    try:
        from db_handler import get_connection
        
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Get MCQs from the recent extraction
                cur.execute("""
                    SELECT id, question_number, question_text, explanation, correct_answer
                    FROM march25_mcqs 
                    WHERE source_file LIKE %s
                    ORDER BY id DESC
                    LIMIT 10
                """, (f"%{os.path.basename(pdf_path)}%",))
                
                rows = cur.fetchall()
                
                if rows:
                    print(f"📋 Recent MCQs with explanations:")
                    explanations_found = 0
                    
                    for row in rows:
                        mcq_id, q_num, question, explanation, correct_answer = row
                        if explanation and len(explanation.strip()) > 50:
                            explanations_found += 1
                            print(f"  ✅ Q{q_num}: Explanation present ({len(explanation)} chars)")
                        else:
                            print(f"  ❌ Q{q_num}: No explanation or too short")
                    
                    print(f"📊 Explanation coverage: {explanations_found}/{len(rows)} MCQs")
                else:
                    print("⚠️ No MCQs found in database to verify")
                    
    except Exception as e:
        print(f"⚠️ Could not verify explanations: {e}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️ Process interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")